## 1. Fix scroll offset clamping in RequestDetailsView

- [ ] 1.1 In `src/components/RequestDetailsView.tsx`, add scroll offset clamping before the slice: `const clampedOffset = Math.min(scrollOffset, Math.max(0, totalLines - visibleHeight))`, then use `clampedOffset` in the `allLines.slice()` call and in the scroll indicator display
- [ ] 1.2 Update the scroll indicator to use `clampedOffset` instead of `scrollOffset`

## 2. Simplify getDetailPanelHeight

- [ ] 2.1 In `src/utils/layout.ts`, replace `getDetailPanelHeight(headerCount, bodyLineCount, maxContentLines)` with `getDetailPanelHeight(totalContentLines: number, maxContentLines: number)` that returns `Math.min(totalContentLines, maxContentLines) + BORDER_ROWS`
- [ ] 2.2 In `src/app.tsx`, update the call site: compute `totalContentLines` from the resolved request (count title + method/URL + separator + headers + header separator + body lines), then pass to the simplified `getDetailPanelHeight(totalContentLines, detailPanelMaxContent)`

## 3. Tests

- [ ] 3.1 Update any existing tests that use the old `getDetailPanelHeight(headerCount, bodyLineCount, maxContentLines)` signature to use the new `getDetailPanelHeight(totalContentLines, maxContentLines)` signature
- [ ] 3.2 Add a test verifying that `getDetailPanelHeight` returns `min(total, max) + 2` for various inputs

## 4. Verification

- [ ] 4.1 Run `npm run build` and verify clean build
- [ ] 4.2 Run `npm test` and verify all tests pass
