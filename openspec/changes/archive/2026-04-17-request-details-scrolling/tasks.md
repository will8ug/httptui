## 1. Types

- [x] 1.1 Expand `FocusedPanel` type from `'requests' | 'response'` to `'requests' | 'details' | 'response'` in `src/core/types.ts`
- [x] 1.2 Add `detailsScrollOffset: number` and `detailsHorizontalOffset: number` to the `AppState` interface in `src/core/types.ts`

## 2. Initial State

- [x] 2.1 Initialize `detailsScrollOffset: 0` and `detailsHorizontalOffset: 0` in `createInitialState()` in `src/app.tsx`

## 3. Reducer — Tab Cycling

- [x] 3.1 Update the `SWITCH_PANEL` case to implement conditional 3-way cycling: when `showRequestDetails` is true, cycle `requests → details → response → requests`; when false, cycle `requests → response → requests`

## 4. Reducer — Focus Transitions

- [x] 4.1 Update the `TOGGLE_REQUEST_DETAILS` case: when toggling off (`state.showRequestDetails` is currently true) and `focusedPanel === 'details'`, set `focusedPanel` to `'response'`; also reset `detailsScrollOffset` and `detailsHorizontalOffset` to 0

## 5. Reducer — Vertical Scroll

- [x] 5.1 Update the `SCROLL` case to add a `'details'` branch: when `focusedPanel === 'details'`, update `detailsScrollOffset` with `Math.max(0, state.detailsScrollOffset + delta)`

## 6. Reducer — Horizontal Scroll

- [x] 6.1 Update the `SCROLL_HORIZONTAL` case to add a `'details'` branch: when `focusedPanel === 'details'`, update `detailsHorizontalOffset` with clamped delta logic matching the existing pattern; compute max offset from details content width

## 7. Reducer — Scroll Offset Resets

- [x] 7.1 Add `detailsScrollOffset: 0` and `detailsHorizontalOffset: 0` reset to the `MOVE_SELECTION` and `SELECT_REQUEST` cases
- [x] 7.2 Add `detailsScrollOffset: 0` and `detailsHorizontalOffset: 0` reset to the `RELOAD_FILE` and `LOAD_FILE` cases

## 8. Key Handler

- [x] 8.1 Update the `useInput` handler: when `focusedPanel === 'details'` and `j/k`/arrows are pressed, dispatch `SCROLL` (not `MOVE_SELECTION`); this follows the same pattern as the `'response'` branch

## 9. Component — RequestDetailsView

- [x] 9.1 Add `focused: boolean`, `scrollOffset: number`, `horizontalOffset: number`, and `visibleHeight: number` props to `RequestDetailsViewProps`
- [x] 9.2 Update border and title color to be focus-aware: `borderColor={focused ? 'cyanBright' : 'gray'}`, title `color={focused ? 'cyanBright' : 'gray'}`
- [x] 9.3 Refactor rendering to build the full content line array without truncation (remove the `maxHeight`-based truncation and ellipsis logic)
- [x] 9.4 Apply slice-based rendering: `lines.slice(scrollOffset, scrollOffset + visibleHeight)` to show only the visible window of content
- [x] 9.5 Add a scroll position indicator line (`↕ {offset+1}/{totalLines} lines` in dim text) when total content lines exceed visible height
- [x] 9.6 Apply horizontal offset to content rendering (shift content left by `horizontalOffset` characters when offset > 0)

## 10. Wiring in App

- [x] 10.1 Pass `focused={state.focusedPanel === 'details'}` to `RequestDetailsView` in `src/app.tsx`
- [x] 10.2 Pass `scrollOffset={state.detailsScrollOffset}` and `horizontalOffset={state.detailsHorizontalOffset}` to `RequestDetailsView`
- [x] 10.3 Compute and pass `visibleHeight` to `RequestDetailsView` based on `detailPanelMaxContent` minus border/chrome overhead

## 11. Tests

- [x] 11.1 Add reducer unit tests for `SWITCH_PANEL` 3-way Tab cycling: verify `requests → details → response → requests` when `showRequestDetails: true`, and `requests → response → requests` when false
- [x] 11.2 Add reducer unit tests for `TOGGLE_REQUEST_DETAILS`: verify focus moves to `'response'` when toggling off while `focusedPanel === 'details'`; verify focus stays unchanged when toggling on
- [x] 11.3 Add reducer unit tests for `SCROLL` action when `focusedPanel === 'details'` — verify `detailsScrollOffset` increments/decrements and `responseScrollOffset` stays unchanged
- [x] 11.4 Add reducer unit tests for `SCROLL_HORIZONTAL` action when `focusedPanel === 'details'` — verify `detailsHorizontalOffset` updates
- [x] 11.5 Add reducer unit tests for `detailsScrollOffset`/`detailsHorizontalOffset` reset on `MOVE_SELECTION`, `SELECT_REQUEST`, `RELOAD_FILE`, `LOAD_FILE`, `TOGGLE_REQUEST_DETAILS` (off)
- [x] 11.6 Add reducer unit test verifying scroll offsets are clamped at 0 (cannot go negative)
- [x] 11.7 Update any existing test fixtures that construct `AppState` objects to include the new `detailsScrollOffset`, `detailsHorizontalOffset` fields and handle the expanded `FocusedPanel` type

## 12. Verification

- [x] 12.1 Run `npm run lint` and fix any lint errors
- [x] 12.2 Run `npm run build` and verify clean build
- [x] 12.3 Run `npm test` and verify all tests pass
