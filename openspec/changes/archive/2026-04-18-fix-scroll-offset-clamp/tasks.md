## 1. Type System

- [x] 1.1 Add optional `maxOffset` field to the `SCROLL` action type in `src/core/types.ts` (alongside existing `direction: 'up' | 'down'`)

## 2. Reducer Clamping

- [x] 2.1 Update the `SCROLL` case in `src/app.tsx` reducer: when `action.maxOffset` is provided, clamp `detailsScrollOffset` to `[0, maxOffset]`; otherwise fall back to `Math.max(0, offset + delta)`
- [x] 2.2 Update the `SCROLL` case in `src/app.tsx` reducer: when `action.maxOffset` is provided, clamp `responseScrollOffset` to `[0, maxOffset]`; otherwise fall back to `Math.max(0, offset + delta)`

## 3. Component-Layer maxOffset Computation

- [x] 3.1 In `src/app.tsx` `useInput` handler: compute `detailsMaxOffset` when `focusedPanel === 'details'` using `totalContentLines` and `visibleHeight` (derived from existing `detailPanelHeight` and content calculation) — dispatch `SCROLL` with `maxOffset`
- [x] 3.2 In `src/app.tsx` `useInput` handler: compute `responseMaxOffset` when `focusedPanel === 'response'` using response content line count and `visibleHeight` (derived from `availableHeight - RESPONSE_PANEL_VERTICAL_CHROME`) — dispatch `SCROLL` with `maxOffset`
- [x] 3.3 Ensure `responseMaxOffset` accounts for `nowrap` and `wrap` modes correctly (in `nowrap` mode: `body.split('\n').length + status + headers + separator`; in `wrap` mode: use `wrapLine` / `wrapColorizedSegments` helpers to compute actual visual line count)

## 4. Component Cleanup

- [x] 4.1 In `src/components/RequestDetailsView.tsx`: remove the `clampedOffset` computation (`Math.min(scrollOffset, Math.max(0, totalLines - visibleHeight))`) and use `scrollOffset` directly for slicing, since the reducer now guarantees the value is in bounds

## 5. Tests

- [x] 5.1 Add unit tests to the reducer tests verifying that `SCROLL` with `maxOffset` clamps `detailsScrollOffset` and `responseScrollOffset` to `[0, maxOffset]`
- [x] 5.2 Add test cases: scrolling down at `maxOffset` is a no-op; scrolling up from `maxOffset` immediately decreases offset; dispatching `SCROLL` without `maxOffset` preserves backward-compatible `Math.max(0, ...)` behavior
- [x] 5.3 Verify existing tests still pass (backward compatibility when `maxOffset` is absent)