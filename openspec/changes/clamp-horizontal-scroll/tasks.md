## 1. Extract shared utility

- [ ] 1.1 Create `src/utils/request.ts` and move the `getRequestTarget` function from `src/components/RequestList.tsx` into it as a named export
- [ ] 1.2 Update `src/components/RequestList.tsx` to import `getRequestTarget` from `../utils/request` instead of defining it locally

## 2. Add max line width helpers

- [ ] 2.1 In `src/app.tsx`, add a helper function `getMaxRequestLineWidth(requests: ParsedRequest[]): number` that computes `Math.max(0, ...requests.map(r => 2 + 7 + getRequestTarget(r.url).length))` (prefix + padded method + target)
- [ ] 2.2 In `src/app.tsx`, add a helper function `getMaxResponseLineWidth(state: AppState): number` that computes the max length across: status line, header lines (if `state.verbose`), and body lines from `state.response`. Returns `0` if no response exists.

## 3. Clamp horizontal offset in reducer

- [ ] 3.1 In the `SCROLL_HORIZONTAL` case of the reducer, for the `response` panel: compute `maxOffset = Math.max(0, getMaxResponseLineWidth(state) - 1)` and clamp `responseHorizontalOffset` to `Math.min(Math.max(0, offset + delta), maxOffset)`
- [ ] 3.2 In the `SCROLL_HORIZONTAL` case of the reducer, for the `requests` panel: compute `maxOffset = Math.max(0, getMaxRequestLineWidth(state.requests) - 1)` and clamp `requestHorizontalOffset` to `Math.min(Math.max(0, offset + delta), maxOffset)`

## 4. Verification

- [ ] 4.1 Run `npx tsc --noEmit` and confirm no type errors
- [ ] 4.2 Run `npx vitest run` and confirm all existing tests pass
