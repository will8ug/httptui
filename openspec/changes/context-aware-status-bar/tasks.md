## 1. Extract Shared Utility

- [x] 1.1 Add `ResolvedRequestDetails` interface and `resolveRequestDetails()` function to `src/utils/request.ts`
- [x] 1.2 Refactor `RequestDetailsView.tsx` to use `resolveRequestDetails()` instead of inline `resolveVariables()` call
- [x] 1.3 Verify `npm run build` passes after utility extraction

## 2. Update StatusBar Component

- [x] 2.1 Add new props to `StatusBarProps` interface: `focusedPanel`, `detailsScrollOffset`, `detailsTotalLines`, `responseScrollOffset`, `responseTotalLines`, `hasResponse`
- [x] 2.2 Implement `getStatusText()` helper to compute context-aware right-side text based on `focusedPanel`
- [x] 2.3 Update `StatusBar` render to display `{fileName} | {statusText}` format
- [x] 2.4 Verify `npm run build` passes

## 3. Update App Component

- [x] 3.1 Import `resolveRequestDetails` and `getResponseTotalLines` in `App.tsx`
- [x] 3.2 Compute `detailsTotalLines` in `App.tsx` using `resolveRequestDetails()`
- [x] 3.3 Compute `responseTotalLines` in `App.tsx` using `getResponseTotalLines()`
- [x] 3.4 Pass new props to `StatusBar` component
- [x] 3.5 Verify `npm run build` passes

## 4. Remove Inline Scroll Indicator

- [x] 4.1 Remove inline scroll indicator logic from `RequestDetailsView.tsx` (lines 100-106)
- [x] 4.2 Verify `npm run build` passes

## 5. Test and Validate

- [x] 5.1 Run `npm test` to ensure all existing tests pass
- [x] 5.2 Manually verify status bar shows correct info for each focused panel
- [x] 5.3 Verify edge cases: no response yet, details panel hidden, single-line content
