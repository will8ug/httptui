## 1. Extract text-slicing helper

- [ ] 1.1 Add `shiftText(text: string, offset: number, maxWidth: number): string` to `src/utils/text.ts`
- [ ] 1.2 Refactor `RequestList.tsx` and `ResponseView.tsx` to use `shiftText()` where applicable (optional cleanup)

## 2. Fix RequestDetailsView horizontal overflow

- [ ] 2.1 Compute `contentWidth` in `RequestDetailsView` using `getResponseContentWidth()`
- [ ] 2.2 Replace negative margin approach with `shiftText()` for the request line (method + URL)
- [ ] 2.3 Replace negative margin approach with `shiftText()` for header lines
- [ ] 2.4 Replace negative margin approach with `shiftText()` for body lines
- [ ] 2.5 Remove the `marginLeft={-horizontalOffset}` hack from the inner Box
- [ ] 2.6 Verify `truncateText()` is applied to all long lines so they fit within panel width

## 3. Test and verify

- [ ] 3.1 Run existing tests: `npm test -- details-scroll`
- [ ] 3.2 Run full test suite: `npm test`
- [ ] 3.3 Verify no TypeScript or lint errors: `npm run build` or `npx tsc --noEmit`
