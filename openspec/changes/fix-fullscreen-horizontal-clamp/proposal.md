## Why

While a panel is fullscreen, the horizontal scroll clamp is computed from the split-layout panel width, but the content renders at fullscreen width. Scrolling to the horizontal edge (`$`, or repeated `l`) therefore overshoots: the longest content line stops far short of the right border — about 36 cells for the response/details panels at 200 columns, and about 164 cells for the requests panel. Confirmed against a user screenshot of a maximized response panel.

## What Changes

- The horizontal scroll clamp (`SCROLL_HORIZONTAL` and `JUMP_HORIZONTAL` bounds) uses the content width of the panel **as rendered**: the fullscreen content width while that panel is maximized, the split-layout width otherwise.
- A single width-selection helper in `src/utils/layout.ts` maps panel + maximized state to the correct content width; the six clamp computations in `src/core/reducers/navigation.ts` use it.
- The **navigation** spec's horizontal-scroll scenarios that leak width formulas and helper names are reworded to observable behavior, and new scenarios pin the fullscreen clamp bound for each panel.
- Action contracts are unchanged: actions keep carrying `columns`, and the default-80 fallback and all existing tests' semantics are preserved.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `navigation`: the `SCROLL_HORIZONTAL` and `JUMP_HORIZONTAL` requirements' clamp bounds become fullscreen-aware (bound derived from the panel's rendered content width, not always the split width); formula-leaking scenarios are reworded to observable outcomes with new fullscreen scenarios added.

## Impact

- Code: `src/utils/layout.ts` (new helper next to the existing width functions), `src/core/reducers/navigation.ts` (six clamp-width lookups swapped to the helper). No changes to action types, input handlers, or components.
- Tests: new reducer cases for maximized panels in `test/core/horizontal-scroll-boundary.test.ts` and `test/core/edge-jump.test.ts`; existing horizontal-scroll tests stay green (the split path and default-80 behavior are unchanged).
- Non-goals, deferred to a follow-up change: the same-family vertical-axis width bugs (`getResponseTotalLines`, `getBodyVisualStart`, `computeVerticalMaxOffset`, and the status-bar line count all use the split width in fullscreen wrap mode); changing the horizontal actions to carry a computed width or bound (rejected alternative); revisiting the `RESPONSE_PANEL_CHROME` constant's 2-cell slack (cosmetic, affects truncation in both layouts).
