## 1. Fix ResponseView visibleHeight calculation

- [x] 1.1 Add `getDetailPanelHeight(headerCount, bodyLineCount, maxContentLines)` utility to `src/utils/layout.ts`
- [x] 1.2 Add `availableHeight` prop to `ResponseView` in `src/components/ResponseView.tsx`
- [x] 1.3 Replace `visibleHeight = rows - 5` with `visibleHeight = availableHeight - 3` in ResponseView
- [x] 1.4 Remove unused `getLeftPanelWidth` import from ResponseView

## 2. Wire up availableHeight in App

- [x] 2.1 In `src/app.tsx`, compute `detailPanelHeight` from the selected request when the detail panel is visible
- [x] 2.2 Calculate `responseAvailableHeight = rows - 1 - detailPanelHeight` and pass to ResponseView

## 3. Fix Layout wrapper height

- [x] 3.1 Remove `height="100%"` from the inner `<Box flexGrow={1}>` in `src/components/Layout.tsx` that wraps `{right}`

## 4. Verification

- [x] 4.1 Run `npm run build` and verify no type errors
- [x] 4.2 Run `npm test` and verify all existing tests pass
- [x] 4.3 Manually verify: with a large response (e.g., `GET /users` in `examples/basic.http`), both "Response" and "Request Details" titles are visible