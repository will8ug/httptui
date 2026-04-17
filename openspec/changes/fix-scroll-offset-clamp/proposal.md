## Why

When the user scrolls down past the bottom boundary in the details or response panel, the scroll offset accumulator keeps incrementing past the visual maximum. Although the display is clamped so the user sees no change, the excess offset remains in state. Scrolling back up requires the user to "work off" the accumulated excess before visible scrolling resumes. This violates the user's expectation that pressing `j` at the bottom is a no-op and pressing `k` immediately scrolls up.

The same pattern already works correctly for horizontal scrolling (`SCROLL_HORIZONTAL`), which passes terminal dimensions via the action payload and clamps the offset to both lower (0) and upper (maxOffset) bounds in the reducer.

## What Changes

- Extend the `SCROLL` action to carry a `maxOffset` field, allowing the reducer to clamp the vertical scroll offset to both boundaries (0 and maxOffset), matching the existing `SCROLL_HORIZONTAL` pattern.
- Compute `maxOffset` in the `useInput` handler (where terminal dimensions and content line counts are already available) and pass it through the action.
- Remove the display-only clamping in `RequestDetailsView.tsx` since the state value will now always be correct.
- Fix `ResponseView.tsx` which currently doesn't clamp `scrollOffset` at all — it can produce empty content when `scrollOffset` exceeds the number of available lines.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `details-panel-scrolling`: Update the "vertical scrolling" requirement to specify that the scroll offset SHALL be clamped to `[0, maxOffset]` in the reducer, not just display-clamped in the component. Add a scenario for the boundary case (scrolling down at the bottom is a no-op).
- `tui`: Add a requirement that vertical scroll offsets in scrollable panels SHALL be clamped to both lower and upper bounds within the reducer, consistent with the existing horizontal scroll clamping pattern.

## Impact

- `src/core/types.ts`: `SCROLL` action type gains an optional `maxOffset` field.
- `src/app.tsx`: `useInput` handler computes `maxOffset` for the focused panel; `SCROLL` reducer case adds `Math.min(offset + delta, action.maxOffset)` clamping.
- `src/components/RequestDetailsView.tsx`: Remove `clampedOffset` computation; use `scrollOffset` prop directly since it's now guaranteed to be in bounds.
- `src/components/ResponseView.tsx`: Same — remove any display-only clamping, use `scrollOffset` directly.
- Existing tests in `test/` may need updates if they assert on unclamped offset values.