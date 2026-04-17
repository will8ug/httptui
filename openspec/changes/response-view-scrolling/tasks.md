## 1. State & Types

- [ ] 1.1 Add `detailsScrollOffset: number` to the `AppState` interface in `src/core/types.ts`
- [ ] 1.2 Initialize `detailsScrollOffset: 0` in `createInitialState()` in `src/app.tsx`

## 2. Reducer Logic

- [ ] 2.1 Update the `SCROLL` case in the reducer to check `state.showRequestDetails && state.focusedPanel === 'response'` — when true, update `detailsScrollOffset` instead of `responseScrollOffset`; clamp to `Math.max(0, ...)` like existing scroll handling
- [ ] 2.2 Add `detailsScrollOffset: 0` reset to the `TOGGLE_REQUEST_DETAILS` case (only when toggling off, i.e., when `state.showRequestDetails` is currently true)
- [ ] 2.3 Add `detailsScrollOffset: 0` reset to the `MOVE_SELECTION` and `SELECT_REQUEST` cases
- [ ] 2.4 Add `detailsScrollOffset: 0` reset to the `RELOAD_FILE` and `LOAD_FILE` cases

## 3. Component Changes

- [ ] 3.1 Update `RequestDetailsViewProps` interface to accept `scrollOffset: number` and `visibleHeight: number` props
- [ ] 3.2 Refactor `RequestDetailsView` to build the full content line array without truncation (remove the `maxHeight`-based truncation and ellipsis logic)
- [ ] 3.3 Apply slice-based rendering: `lines.slice(scrollOffset, scrollOffset + visibleHeight)` to show only the visible window of content
- [ ] 3.4 Add a scroll position indicator line (`↕ {offset+1}/{totalLines} lines` in dim text) when total content lines exceed visible height

## 4. Wiring in App

- [ ] 4.1 Pass `state.detailsScrollOffset` as `scrollOffset` prop to `RequestDetailsView` in `src/app.tsx`
- [ ] 4.2 Compute and pass `visibleHeight` to `RequestDetailsView` based on `detailPanelMaxContent` minus border/chrome overhead

## 5. Tests

- [ ] 5.1 Add reducer unit tests for `SCROLL` action when `showRequestDetails: true` and `focusedPanel: 'response'` — verify `detailsScrollOffset` increments/decrements and `responseScrollOffset` stays unchanged
- [ ] 5.2 Add reducer unit tests for `detailsScrollOffset` reset on `TOGGLE_REQUEST_DETAILS`, `MOVE_SELECTION`, `SELECT_REQUEST`, `RELOAD_FILE`, `LOAD_FILE`
- [ ] 5.3 Add reducer unit test verifying scroll offset is clamped at 0 (cannot go negative)
- [ ] 5.4 Update any existing test fixtures that construct `AppState` objects to include the new `detailsScrollOffset` field

## 6. Verification

- [ ] 6.1 Run `npm run lint` and fix any lint errors
- [ ] 6.2 Run `npm run build` and verify clean build
- [ ] 6.3 Run `npm test` and verify all tests pass
