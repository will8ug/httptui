## Why

`reducer.ts` exports three horizontal-scroll-bounds helpers — `getMaxRequestLineWidth`, `getMaxResponseLineWidth`, and `getMaxDetailsLineWidth` — alongside its state-transition logic. These functions compute rendered line widths to clamp scroll offsets, the same job that `utils/scroll.ts` already does for the vertical axis (`getDetailsTotalLines`, `getResponseTotalLines`, `getMaxScrollOffset`). The split is a layering leak: the reducer encodes rendering constants (the `2`-char prefix and `7`-char method padding of the request list) that belong in the view layer, and `getMaxResponseLineWidth` / `getMaxDetailsLineWidth` take `AppState` directly, which would force `utils/` to import from `core/types` if they were moved as-is. The functions are a family with the existing scroll helpers; they should live together, and their signatures should match the option-bag convention `scroll.ts` already follows.

## What Changes

- Move `getMaxRequestLineWidth`, `getMaxResponseLineWidth`, and `getMaxDetailsLineWidth` from `src/core/reducer.ts` to `src/utils/scroll.ts`.
- Refactor signatures from `AppState`-taking to option-bag-taking, matching the existing `getDetailsTotalLines({ method, url, headers, body })` and `getResponseTotalLines({ response, verbose, rawMode, ... })` pattern. This removes the only `utils/` → `core/types` dependency edge (`AppState` import) and makes each helper independently testable with explicit inputs.
- Update all callers in `reducer.ts` (`SCROLL_HORIZONTAL`, `JUMP_HORIZONTAL` cases) to pass option bags instead of `state`.
- Update all test callers (`horizontal-scroll-boundary.test.ts`, `edge-jump.test.ts`, `request-list-display.test.ts`, `request-list-resolution.test.ts`) to import from `utils/scroll` and pass option bags.
- No behavioral change: every function's output is identical for the same inputs, only the import location and signature shape change.

## Capabilities

### New Capabilities
<!-- None. This is a pure relocation + signature refactor; no new capability is introduced. -->

### Modified Capabilities
- `navigation`: The JUMP_HORIZONTAL and SCROLL_HORIZONTAL scroll-bound computation in `reducer.ts` no longer calls `getMaxRequestLineWidth(requests)` / `getMaxResponseLineWidth(state)` / `getMaxDetailsLineWidth(state)` directly from `core/reducer.ts`; it calls option-bag variants in `utils/scroll.ts`. The behavior is unchanged; the spec must reflect the new import origin and the option-bag call shape so the spec matches the implementation, preserving the inspection criterion.

## Impact

- **Modified code:**
  - `src/utils/scroll.ts` — receives the three width helpers, now with option-bag signatures.
  - `src/core/reducer.ts` — loses the three `export function getMax*LineWidth` declarations and their supporting imports (`formatResponseBody`, `formatStatusLine`, `resolveVariables`, `getRequestTarget`); gains an import from `../utils/scroll`. The 6 call sites in `reducer.ts` pass option bags.
  - No other source file imports the three functions — confirmed by `grep` across `src/`.
- **Modified tests** (import path + call shape only):
  - `test/core/horizontal-scroll-boundary.test.ts`
  - `test/core/edge-jump.test.ts`
  - `test/core/request-list-display.test.ts`
  - `test/integration/request-list-resolution.test.ts`
- **Spec delta:** `navigation/spec.md` references `getMaxRequestLineWidth(requests)` / `getMaxDetailsLineWidth(state)` / `getMaxResponseLineWidth(state)` by name in the `JUMP_HORIZONTAL` requirement and its scenarios. The delta updates these references to the option-bag call shape.
- **No new dependencies, no new files, no state-shape or action-type changes.** Pure relocation + signature cleanup.