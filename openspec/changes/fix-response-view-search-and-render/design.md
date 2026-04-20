## Context

`ResponseView` is the right-hand panel that renders the HTTP response (status line, optional headers, separator, body) with support for three display modes:

1. `wrapMode === 'wrap'` — long lines wrap at the panel boundary.
2. `wrapMode === 'nowrap' && horizontalOffset > 0` — long lines are truncated with `…`; horizontal scroll is active.
3. `wrapMode === 'nowrap' && horizontalOffset === 0` — long lines are truncated with `…`; no shift.

The current implementation is a single ~245-line function with three near-identical branches that each re-emit `responseLines` entries. On top of this, search-match decoration (`►` for current match, `·` for others) and scroll-to-match math (`responseScrollOffset`) are computed with the scalar:

```
headerOffset = 1 + (verbose ? headerCount : 0) + 1
matchVisualIndex = searchMatches[rawBodyIdx] + headerOffset
```

computed both in `ResponseView.tsx` (for decoration) and in `app.tsx` (for `CONFIRM_SEARCH` / `NEXT_MATCH` / `PREV_MATCH` dispatches). This formula assumes each pre-body item occupies exactly one visual line and each body line occupies exactly one visual line — assumptions that hold only when nothing wraps. In `wrap` mode with long status / headers / body lines, the decoration and scroll both drift.

Meanwhile, `src/utils/scroll.ts#getResponseTotalLines` already contains the correct visual-line arithmetic for vertical-scroll bounding. That knowledge is partially reimplemented (and broken) inside `ResponseView` for decoration purposes.

Constraints:

- Must not regress the pure-unit / reducer-unit / integration test matrix described in `AGENTS.md`.
- Must keep `nowrap` behavior byte-identical (current tests pin this).
- Must remain pure ESM, must not introduce new runtime dependencies.
- `reducer.ts` must remain a pure function (no React, no Ink, no `useStdout`). Actions may grow but their payloads must stay serializable-ish (numbers, arrays, simple records) so that reducer tests stay trivial.
- The render pipeline runs on every keypress; the new ledger must be O(totalLines) and must not add quadratic work.

Stakeholders: interactive TUI users running `.http` files against real APIs (long `Set-Cookie`, `Content-Security-Policy`, `X-Trace-Id` headers are routine).

## Goals / Non-Goals

**Goals:**

- One source of truth for "where does raw body line `i` start in the rendered visual layout?" — consumed by both the renderer (decoration) and the reducer dispatcher (scroll).
- Search `►` / `·` markers and scroll-to-match land on the correct **visual** line in both `wrap` and `nowrap` modes for arbitrary long status/header/body content.
- The three rendering branches inside `ResponseView` collapse to one pipeline: build sections once, apply a per-line transform strategy, emit a single `responseLines` array.
- Restore the gray `HTTP/1.1 ` prefix on the first wrapped status line in `wrap` mode (stylistic parity with the non-wrapped path).
- Remove duplicated helpers: `truncateText` (one copy in `src/utils/text.ts`), `isJsonString` (one canonical copy), `formatStatusLine` (one canonical copy).
- New tests that would fail today catch wrap-mode search drift, wrap-mode status styling regression, and re-duplication of helpers.

**Non-Goals:**

- Grouping `ResponseView`'s 17 props into sub-objects (`SearchState`, `DisplayOptions`, …). Out of scope per user direction.
- Simplifying the tautological `showSearchBar` condition or nested-ternary title. Out of scope.
- Horizontal-scroll (`horizontalOffset > 0`) correctness audit beyond what falls out naturally from the pipeline unification.
- Changing `.http` parser, executor, or CLI contracts.
- Visual-only design changes (colors, borders, layout math other than what's needed for the ledger).

## Decisions

### D1 — Introduce a `ResponseLayout` ledger as the single source of truth

Create a pure function, colocated with the existing visual-line math:

```ts
// src/core/responseLayout.ts (new)
export type VisualSection =
  | { kind: 'status'; visualLines: ColorSegment[][]; }
  | { kind: 'header'; name: string; visualLines: ColorSegment[][]; }
  | { kind: 'separator'; visualLines: ColorSegment[][]; }
  | { kind: 'body'; rawBodyIndex: number; visualLines: ColorSegment[][]; };

export interface ResponseLayout {
  sections: VisualSection[];        // in render order
  totalVisualLines: number;         // = sum of section.visualLines.length
  bodyStartVisualIndex: number;     // first body line's visual index (was headerOffset)
  bodyVisualStart: number[];        // bodyVisualStart[rawBodyIdx] = first visual line of that body line
}

export function computeResponseLayout(options: {
  response: ResponseData;
  verbose: boolean;
  rawMode: boolean;
  wrapMode: WrapMode;
  contentWidth: number;
}): ResponseLayout;
```

**Rationale:**

- The ledger is the `visualStart[]` structure already sketched in the review. It lives under `src/core/` (not `utils/`) because it carries enough semantic weight to be a core concept consumed by both the renderer and the reducer dispatcher.
- Storing `ColorSegment[][]` directly (not just counts) lets the renderer consume the same structure it uses for decoration, eliminating a second pass over the body.
- `getResponseTotalLines` in `src/utils/scroll.ts` becomes `layout.totalVisualLines`; the old function is re-expressed as a thin wrapper to preserve backward compatibility during migration.

**Alternatives considered:**

- *Keep the scalar `headerOffset`, add a second scalar `bodyVisualOffsetTable: number[]`.* Smaller change, but splits the mapping across two shapes and still duplicates the "how many visual lines does each header occupy" computation between the ledger and the renderer. Rejected for continued duplication risk.
- *Compute the ledger inside `ResponseView` only, and have `app.tsx` call a separate helper for reducer-bound scroll math.* Duplicates visual-line math across two call sites. Rejected.
- *Dispatch the entire pre-computed `ResponseLayout` through the `CONFIRM_SEARCH` action.* Payload gets large and couples the reducer to a renderer concept. Instead (see D2), dispatch only the two scalars the reducer actually needs per action.

### D2 — Action payloads carry scalars derived from the ledger, not the ledger itself

`CONFIRM_SEARCH`, `NEXT_MATCH`, `PREV_MATCH` continue to receive numbers, but the numbers change meaning:

```ts
// Before
{ type: 'NEXT_MATCH'; headerOffset: number; maxOffset?: number }

// After
{ type: 'NEXT_MATCH';
  // rawBodyIdx -> visual line index; sliced for the matches in play
  bodyVisualStart: number[];
  maxOffset?: number;
}
```

`computeSearchScrollOffset(bodyLineIndex, headerOffset)` becomes `computeSearchScrollOffset(rawBodyIdx, bodyVisualStart, maxOffset?)` — looks up `bodyVisualStart[rawBodyIdx]` directly. `app.tsx` derives `bodyVisualStart` once from the `ResponseLayout` and dispatches it. Tests can either feed a tiny hand-built `bodyVisualStart` (keeps the literal-simplicity of the current tests) *or* derive one from `computeResponseLayout` (tests the full pipeline).

**Rationale:** Minimal coupling between reducer and renderer. Reducer still only sees numbers. Existing hand-literal tests remain ergonomic. New end-to-end tests get the fidelity they need.

**Alternatives considered:**

- *Keep `headerOffset` scalar and add a separate `bodyLineWrapCount: number[]`.* Two payloads to keep in sync. Rejected.
- *Move `responseScrollOffset` computation out of the reducer entirely into `app.tsx`.* Violates the reducer's ownership of `responseScrollOffset`; makes scroll-to-match untestable at the reducer tier. Rejected.

### D3 — Collapse three rendering branches into one pipeline via a `LineTransform` strategy

After `computeResponseLayout` produces `sections[]`, the renderer walks each section's `visualLines: ColorSegment[][]` once and applies a transform strategy:

```ts
type LineTransform =
  | { kind: 'pass' }                                   // wrap mode: visualLines are already wrapped
  | { kind: 'truncate'; maxWidth: number }             // plain mode: truncate each visualLine[0]
  | { kind: 'shift'; offset: number; maxWidth: number }; // h-scroll mode: shift + truncate
```

**Rationale:**

- The three current branches differ only in this per-line transform. Making it explicit:
  - Removes the duplicated loops over status / headers / separator / body.
  - Makes the "status line composed of gray `HTTP/1.1 ` + colored code + gray ` NNNms`" a single declaration (fix for the dead `if/else` — the first wrapped line keeps the structured color because it's built once from `ColorSegment[]`, not re-joined and re-colored per branch).
  - Gives decoration a clean hook: `layout.sections.flatMap(s => s.visualLines)` = the exact array we decorate, indexed identically to `bodyVisualStart`.
- In `wrap` mode the transform is `pass` because `computeResponseLayout` already wraps the segments (re-using `wrapColorizedSegments` from `src/utils/wrap.ts`). In `nowrap + no-shift` mode the transform is `truncate`. In `nowrap + shift` mode the transform is `shift`. In `wrap` mode the ledger produces exactly the visual lines that end up rendered.

**Alternatives considered:**

- *Three small renderer functions (`renderWrap`, `renderShift`, `renderPlain`) sharing helpers but without a ledger.* Still leaves visual-line math ambiguous and still duplicates the "build status lines" logic three times. Rejected in favor of the ledger-first approach.
- *Keep branches but extract helpers for status/headers/separator/body.* Smaller change, but doesn't fix the decoration bug because the ledger still wouldn't exist. Rejected.

### D4 — Status line is built once as `ColorSegment[]`, then wrapped/transformed uniformly

`formatStatusLine(response)` returns a `ColorSegment[]`:

```ts
[
  { text: 'HTTP/1.1 ', color: 'gray' },
  { text: `${code} ${statusText}`, color: getStatusColor(code) },
  { text: `  ${Math.round(durationMs)}ms`, color: 'gray' },
]
```

In `wrap` mode, `wrapColorizedSegments` splits these segments at the panel boundary — preserving the gray `HTTP/1.1 ` prefix on the first wrapped line and carrying the status-code color into whatever spills to subsequent lines. This is the structural fix for the flattened `if (index === 0)` branch: the code never needs that conditional because the segmented data carries the styling through `wrapColorizedSegments` unchanged.

**Rationale:** Fix #4 (dead branch) and #1 (ledger) share the same root cause — visual-line math missing a color-segment dimension. Fixing them together produces one implementation instead of two.

**Alternatives considered:**

- *Restore the gray prefix manually inside the `index === 0` branch and leave the rest unchanged.* Papering over the symptom; doesn't remove the duplication between branches; still relies on `headerOffset` arithmetic for decoration. Rejected.

### D5 — Co-locate `isJsonString`, `truncateText`, `formatStatusLine` in `src/utils/` and delete duplicates

- `src/utils/text.ts` (new): `truncateText(value, maxWidth)` — moved from `ResponseView.tsx` and `RequestList.tsx`.
- `src/utils/json.ts` (new) OR extend `src/utils/colors.ts`: a single `isJsonString(value)` — callers in `ResponseView.tsx` and `src/utils/scroll.ts` switch to this. Decision: **extend** `src/utils/colors.ts` — it already owns the JSON concept via `colorizeJson`, and adding a peer `isJsonString` keeps the JSON-helper cluster in one file. No new file.
- `src/core/responseLayout.ts` (new) exports `formatStatusLine(response)` as an internal helper, also re-exported so that any future call site uses one definition.

**Rationale:** Each helper has one home, one test file, one import surface. Ends the drift where `isJson` in `ResponseView.tsx` and `isJsonString` in `scroll.ts` slowly diverge.

### D6 — Test strategy: three tiers must all gain new cases

Following `AGENTS.md`'s three-tier structure:

- **Pure unit**: `test/responseLayout.test.ts` (new). Covers `computeResponseLayout` directly:
  - wrap + long status line ⇒ status section produces >1 visual line; `bodyStartVisualIndex` reflects it.
  - wrap + verbose + long header ⇒ header visual lines expand; `bodyStartVisualIndex` shifts accordingly.
  - wrap + long body line ⇒ `bodyVisualStart[i+1] - bodyVisualStart[i] > 1`.
  - nowrap equivalence ⇒ ledger collapses to the legacy `1 + headerCount + 1` shape (regression guard on nowrap paths).
- **Reducer unit**: `test/search.test.ts` extended. New cases that construct `bodyVisualStart` from `computeResponseLayout` (not a literal) and assert `responseScrollOffset` lands correctly in wrap mode. The existing literal-offset tests remain untouched to preserve coverage of the bare reducer math.
- **Integration**: `test/integration/response-search-wrap.test.tsx` (new). Renders `<App>` via `ink-testing-library`, presses `w` (enable wrap), sends a request against a mocked executor returning a response with both a long header and a long body line, runs `/query<Enter>`, and asserts the `►` marker appears on the line containing the match (inspected via `lastFrame()`).

**Rationale:** The current `test/search.test.ts` proves the reducer math given a literal offset. The bug lives in the seam between offset computation and reducer math. New tests close the seam in all three tiers to prevent reintroduction.

## Risks / Trade-offs

- **Risk:** `computeResponseLayout` duplicates the wrap computation if the renderer also calls `wrapColorizedSegments` downstream. → **Mitigation:** The renderer consumes `layout.sections[].visualLines` directly — no second wrap pass. `getResponseTotalLines` is re-expressed in terms of `computeResponseLayout(...).totalVisualLines` so there's exactly one wrap pass per render.
- **Risk:** Increased memory footprint — storing `ColorSegment[][]` per section for large responses. → **Mitigation:** Responses are already materialized as strings in memory; the ledger's per-line segment arrays are small (one per visible line; large bodies are not a common case for `.http` TUI use and the existing code already constructs equivalent segment data per render). Profile if needed during implementation.
- **Risk:** Action payload size — `bodyVisualStart` for a 10k-line body is a 10k-entry number array sent through the reducer. → **Mitigation:** Only the `rawBodyIdx` values present in `searchMatches` matter for scroll math; `app.tsx` slices `bodyVisualStart` to just `searchMatches.map(i => bodyVisualStart[i])` (or passes a lookup function result for the target match only). Dispatch the minimum needed: for `NEXT_MATCH`/`PREV_MATCH` the target visual index alone; for `CONFIRM_SEARCH` the first-match visual index alone. Final action shape: `{ type: 'NEXT_MATCH'; targetVisualIndex: number; maxOffset?: number }`. Simpler than passing the whole array; reducer no longer does the mapping — `app.tsx` does, using the ledger it already has. This is a revision of D2's initial sketch.
- **Risk:** Tests become coupled to the ledger's internal shape. → **Mitigation:** Export a small stable public surface (`totalVisualLines`, `bodyStartVisualIndex`, `bodyVisualStart`, `sections` with `kind` discriminator). Add one snapshot-style test pinning the public shape for a representative input.
- **Trade-off:** The refactor touches more files than a minimal bugfix. → **Justified because:** the minimal bugfix would require adding wrap-awareness to `headerOffset` arithmetic at two sites (`app.tsx` and `ResponseView.tsx`) and would not eliminate the third copy of the math in `scroll.ts`. The unified ledger is a one-time cost that pays for itself the next time anyone touches response rendering.
- **Trade-off:** `isJsonString` moving from `scroll.ts` to `colors.ts` requires `scroll.ts` to import from `colors.ts`. → **Acceptable:** `scroll.ts` already imports `colorizeJson` from `colors.ts`; the new import is adjacent and non-circular.

## Migration Plan

This is an internal refactor with no external contract changes, so migration is strictly an ordered refactor sequence driven by `tasks.md`. Rollback is `git revert`.

High-level order (detailed breakdown lives in `tasks.md`):

1. Add `src/utils/text.ts` with `truncateText`; update `RequestList.tsx` and `ResponseView.tsx` imports. Tests should still pass (pure code motion).
2. Consolidate `isJsonString` in `src/utils/colors.ts`; remove `isJson` from `ResponseView.tsx` and duplicate from `src/utils/scroll.ts`. Tests pass.
3. Introduce `src/core/responseLayout.ts` with `computeResponseLayout` and `formatStatusLine`. Port `getResponseTotalLines` to delegate to it. All existing tests pass.
4. Add `test/responseLayout.test.ts` — proves the ledger before any renderer changes consume it.
5. Update `CONFIRM_SEARCH` / `NEXT_MATCH` / `PREV_MATCH` action payloads and `computeSearchScrollOffset`. Update `app.tsx` to derive target visual indices from the ledger. Update `test/search.test.ts` assertions (literal-offset tests keep working with adapted payload, plus new ledger-driven cases).
6. Refactor `ResponseView.tsx` to the single-pipeline + `LineTransform` shape; consume `layout.sections`. Decoration now indexes into the flat `layout.sections.flatMap(s => s.visualLines)` array by visual index; marker colors unchanged.
7. Add `test/integration/response-search-wrap.test.tsx` covering the wrap-mode marker placement end-to-end.
8. Run `npm run build && npm test && npm run lint`. Fix any uncovered regressions.

Each step leaves the tree green; intermediate commits are safe rollback points.

## Open Questions

- **Action payload final shape.** D2 initially suggests passing `bodyVisualStart: number[]`; the Risks section argues for passing just the target visual index. Settled in favor of the latter (simpler, bounded, reducer stays trivial). Flagged here so `specs/response-search/spec.md` reflects the settled form.
- **Does the horizontal-scroll branch (`horizontalOffset > 0`) inherit any latent search-decoration bugs?** Not addressed by D1–D4 because search markers in `horizontalOffset > 0` mode live after the shift (decoration is applied to the already-flat `responseLines`, so the mapping is 1:1 in nowrap mode). Worth a sanity test during implementation; capture as a follow-up if the sanity test surfaces anything unexpected. Not in scope for this change per user direction.
- **`bodyVisualStart` in raw mode.** `formatResponseBody(body, rawMode=true)` returns `body` unchanged. Search matches are computed against this. Ledger construction must run on the same formatted output both search and render consume, so the `rawMode` flag passes through `computeResponseLayout`. Confirm during implementation that the `formatResponseBody` call happens exactly once per render (pass the formatted string in, don't re-format inside the ledger).
