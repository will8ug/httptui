## Context

`src/core/reducer.ts` (775 lines) currently exports three helpers that compute rendered line widths so that `SCROLL_HORIZONTAL` and `JUMP_HORIZONTAL` can clamp scroll offsets:

```
getMaxRequestLineWidth   ← 2 + 7 + getRequestTarget(resolved.url).length      ← request list rendering constants
getMaxResponseLineWidth  ← depends on state.response, verbose, rawMode         ← response rendering
getMaxDetailsLineWidth   ← depends on state.requests[selectedIndex], variables ← details panel rendering
```

All three are called from exactly two reducer cases (`SCROLL_HORIZONTAL` and `JUMP_HORIZONTAL`), each with three `focusedPanel` branches — 6 call sites total. They are also imported directly by 4 test files.

`src/utils/scroll.ts` (45 lines) already owns the **vertical** scroll-bounds family:

```
getDetailsTotalLines({ method, url, headers, body, formdataFields })  ← option bag
getResponseTotalLines({ response, verbose, rawMode, wrapMode, columns })  ← option bag
getMaxScrollOffset(totalLines, visibleHeight)
```

The naming parallel is exact: `getMax*LineWidth` is the **horizontal** axis of the same problem that `get*TotalLines` solves for the vertical axis. The two families should live together.

The two `AppState`-taking functions (`getMaxResponseLineWidth`, `getMaxDetailsLineWidth`) pull `state.response`, `state.verbose`, `state.rawMode`, `state.requests[selectedIndex]`, `state.variables` out of `AppState`. Moving them as-is would import `AppState` from `core/types` into `utils/`, reversing the direction. The existing `scroll.ts` functions avoid this by accepting **option bags** — explicit typed fields, not the whole state. The three width helpers need to follow the same convention.

## Goals / Non-Goals

**Goals:**
- All scroll-bound calculations (vertical + horizontal) live in `src/utils/scroll.ts`.
- `reducer.ts` imports width helpers from `utils/scroll` instead of defining them.
- All three width helpers take option bags, matching `getDetailsTotalLines` / `getResponseTotalLines` — no `AppState` parameter.
- `utils/scroll.ts` does not import `AppState` from `core/types`.
- All callers (6 source call sites + 4 test files) updated; zero behavioral change.
- The navigation spec's references to `getMaxRequestLineWidth(requests)` / `getMaxDetailsLineWidth(state)` / `getMaxResponseLineWidth(state)` are updated to match the new option-bag call shape.

**Non-Goals:**
- Changing the scroll-bound formulas (the `2` + `7` + path-length constants stay).
- Refactoring `computeVerticalMaxOffset` (also in `reducer.ts`): it's a state-orchestration helper that genuinely belongs in the reducer because it fans out to three panels using multiple helpers. The three `getMax*LineWidth` functions are leaf-level pure helpers; `computeVerticalMaxOffset` is a composition layer over them and `getMaxScrollOffset`. Leave it in the reducer.
- Merging the three width functions into one parameterized function: they have different input shapes (requests list vs. response vs. single selected request) and different rendering logic. Three functions is the right cardinality.
- Introducing memoization: re-resolution on every scroll action is unchanged from today; no new performance cliff.
- Renaming `scroll.ts` to `scroll-bounds.ts` or `panel-dimensions.ts`: the width functions are scroll bounds, `scroll.ts` already means "scroll bounds", and the rename would churn imports without clarifying meaning.

## Decisions

### Decision: Move all three to `utils/scroll.ts` (not a new file)

The three `getMax*LineWidth` functions are scroll bounds — the same family as `get*TotalLines` and `getMaxScrollOffset` already in `scroll.ts`. Splitting them into a new file (`line-width.ts`, `panel-dimensions.ts`, etc.) would break the conceptual grouping and force callers to import scroll bounds from two files.

**Alternatives considered:**
- New `utils/line-width.ts` — rejected: artificially splits the scroll-bounds family; "what name do you give a file that holds width functions?" has no obviously right answer.
- Move `getMaxRequestLineWidth` to `utils/request.ts` (alongside `getRequestTarget`) — rejected: breaks the family; the response and details width helpers would still need a home, and callers would have to import from three places.
- Keep in `reducer.ts` — rejected: the reducer should own state transitions, not rendering-width calculations. The `2` (prefix) and `7` (method padEnd) constants are view-layer knowledge leaking into the state layer.

### Decision: Option-bag signatures, no `AppState` import

The three functions become:

```ts
getMaxRequestLineWidth({
  requests: readonly ParsedRequest[];
  variables: FileVariable[];
  baseDir?: string;
}): number

getMaxResponseLineWidth({
  response: ResponseData | null;
  verbose: boolean;
  rawMode: boolean;
}): number

getMaxDetailsLineWidth({
  request: ParsedRequest | undefined;
  variables: FileVariable[];
}): number
```

`getMaxResponseLineWidth` returns `0` when `response` is `null`; `getMaxDetailsLineWidth` returns `0` when `request` is `undefined`. Both null-guard branches already exist in `reducer.ts` — the null check just moves into the option-bag-unpacking body rather than reading from `state.response` / `state.requests[state.selectedIndex]`.

**Alternatives considered:**
- Keep `AppState` parameter — rejected: would import `core/types` from `utils/`, reversing the dependency direction and making the helpers untestable without constructing a full `AppState`.
- Take already-resolved fields (like `getDetailsTotalLines` takes `{ method, url, headers, body }`) — rejected: `getMaxResponseLineWidth` and `getMaxDetailsLineWidth` each call `formatStatusLine` / `formatResponseBody` / `resolveVariables`, which are part of the width computation, not the caller's responsibility. Pushing resolution to the caller duplicates logic across 6 call sites.
- Take `ResolvedRequest` instead of `ParsedRequest` + `variables` — rejected: forces the 6 call sites to resolve before calling, duplicating `resolveVariables` calls. The function should own its resolution step; the caller just passes inputs.

### Decision: Keep `getMaxRequestLineWidth`'s existing option-bag shape

It already takes `(requests, variables, baseDir)` as positional args (a recent change from `fix-request-list-variable-resolution`). The refactor upgrades it to an option bag: `{ requests, variables, baseDir }`. This is a minor call-site change (destructure at the call site) but matches the convention.

### Decision: Update the navigation spec in lockstep

`openspec/specs/navigation/spec.md` currently references the functions by their old signatures in the `JUMP_HORIZONTAL` requirement and its scenarios (e.g. `getMaxRequestLineWidth(requests)`, `getMaxDetailsLineWidth(state)`, `getMaxResponseLineWidth(state)`). The delta updates these to the option-bag call shape so the spec matches the implementation. The **formulas** (`max(0, getMaxRequestLineWidth(...) - getRequestContentWidth(columns))`) are unchanged; only the function-call syntax changes.

## Risks / Trade-offs

- **[Option-bag call-site verbosity]** The 6 reducer call sites go from `getMaxRequestLineWidth(state.requests, state.variables, dirname(state.filePath))` to `getMaxRequestLineWidth({ requests: state.requests, variables: state.variables, baseDir: dirname(state.filePath) })`. Slightly longer; consistent with `getMaxScrollOffset` and the rest of `scroll.ts`. → **Mitigation**: the verbosity is the point — explicitness clarifies which state fields each helper actually reads.
- **[Test import churn]** 4 test files change their import path and call shape. → **Mitigation**: mechanical change, fully covered by passing test runs after the edit. No assertion logic changes.
- **[Two `ParsedRequest | undefined` / `ResponseData | null` nullable fields in option bags]** The null-coalescing branches (`if (!response) return 0;` / `if (!request) return 0;`) move into the function bodies. → **Mitigation**: the branches already exist in `reducer.ts`; the move is literal, preserving behavior. Tests cover the null-input path (existing tests in `horizontal-scroll-boundary.test.ts` exercise the empty-response and no-request cases).
- **[`scroll.ts` grows from 45 to ~110 lines]** Still small by project standards (reducer is 775). The file's cohesion improves because it now owns the complete scroll-bounds family. → **Mitigation**: none needed; the growth is the goal.
- **[`scroll.ts` now imports `formatStatusLine` / `formatResponseBody` / `resolveVariables` from `core/`]** `scroll.ts` already imports `formatResponseBody` and `computeResponseLayout` from `core/`. Adding `formatStatusLine` and `resolveVariables` extends the same `core → utils` edge that already exists. → **Mitigation**: the edge is pre-existing; no new module dependency direction is introduced.