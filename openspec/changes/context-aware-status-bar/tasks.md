## 1. Extract Shared Utility

- [ ] 1.1 Add `ResolvedRequestDetails` interface and `resolveRequestDetails()` function to `src/utils/request.ts`
- [ ] 1.2 Refactor `RequestDetailsView.tsx` to use `resolveRequestDetails()` instead of inline `resolveVariables()` call
- [ ] 1.3 Verify `npm run build` passes after utility extraction

## 2. Update StatusBar Component

- [ ] 2.1 Add new props to `StatusBarProps` interface: `focusedPanel`, `detailsScrollOffset`, `detailsTotalLines`, `responseScrollOffset`, `responseTotalLines`, `hasResponse`
- [ ] 2.2 Implement `getStatusText()` helper to compute context-aware right-side text based on `focusedPanel`
- [ ] 2.3 Update `StatusBar` render to display `{fileName} | {statusText}` format
- [ ] 2.4 Verify `npm run build` passes

## 3. Update App Component

- [ ] 3.1 Import `resolveRequestDetails` and `getResponseTotalLines` in `App.tsx`
- [ ] 3.2 Compute `detailsTotalLines` in `App.tsx` using `resolveRequestDetails()`
- [ ] 3.3 Compute `responseTotalLines` in `App.tsx` using `getResponseTotalLines()`
- [ ] 3.4 Pass new props to `StatusBar` component
- [ ] 3.5 Verify `npm run build` passes

## 4. Remove Inline Scroll Indicator

- [ ] 4.1 Remove inline scroll indicator logic from `RequestDetailsView.tsx` (lines 100-106)
- [ ] 4.2 Verify `npm run build` passes

## 5. Test and Validate

- [ ] 5.1 Run `npm test` to ensure all existing tests pass
- [ ] 5.2 Manually verify status bar shows correct info for each focused panel
- [ ] 5.3 Verify edge cases: no response yet, details panel hidden, single-line content
