## 1. Extract layout utilities

- [x] 1.1 Create `src/utils/layout.ts` with `getLeftPanelWidth(columns: number): number` (logic: `clamp(floor(columns * 0.3), 25, 36)`), `getRequestContentWidth(columns: number): number` (logic: `max(10, leftPanelWidth - 4)`), and `getResponseContentWidth(columns: number): number` (logic: `max(20, columns - leftPanelWidth - 6)`)
- [x] 1.2 Replace the local `getLeftPanelWidth` copies in `Layout.tsx`, `ResponseView.tsx`, and `RequestList.tsx` with imports from `src/utils/layout.ts`; update the `contentWidth` computations to use `getRequestContentWidth` / `getResponseContentWidth`

## 2. Update SCROLL_HORIZONTAL action type

- [x] 2.1 Add an optional `columns` field to the `SCROLL_HORIZONTAL` action in `src/core/types.ts`: `{ type: 'SCROLL_HORIZONTAL'; direction: 'left' | 'right'; columns?: number }`

## 3. Update reducer boundary calculation

- [x] 3.1 In `src/app.tsx`, update the `SCROLL_HORIZONTAL` case in the reducer to default `columns` to `80` if absent, compute `requestContentWidth` / `responseContentWidth` using the layout utilities, and change `maxOffset` from `maxLineWidth - 1` to `max(0, maxLineWidth - contentWidth)` for both panels
- [x] 3.2 Update `getMaxRequestLineWidth` and `getMaxResponseLineWidth` to remain pure (they still compute max line width; the contentWidth subtraction happens in the reducer)

## 4. Update useInput dispatch call

- [x] 4.1 In `src/app.tsx`, update the `SCROLL_HORIZONTAL` dispatches in `useInput` to include `columns` from `useStdout()`: `dispatch({ type: 'SCROLL_HORIZONTAL', direction: isLeft ? 'left' : 'right', columns: stdout.columns || 80 })`

## 5. Update tests

- [x] 5.1 Update existing horizontal scroll tests in `test/` to pass `columns` in `SCROLL_HORIZONTAL` actions and assert the new boundary (`maxLineWidth - contentWidth` instead of `maxLineWidth - 1`)
- [x] 5.2 Add a test case verifying that horizontal offset is clamped to `0` when `maxLineWidth <= contentWidth` (content fits entirely within the panel — no scrolling needed)
- [x] 5.3 Add a test case verifying that horizontal offset is clamped to `maxLineWidth - contentWidth` when `maxLineWidth > contentWidth` and the user scrolls right beyond the boundary
- [x] 5.4 Run `npm run build && npm test` to confirm all tests pass