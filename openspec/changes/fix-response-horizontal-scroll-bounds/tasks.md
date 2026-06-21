## 1. Fix `getMaxResponseLineWidth` measurement

- [ ] 1.1 In `src/core/reducer.ts`, update `getMaxResponseLineWidth(state)` so the body lines pushed into the measurement array come from `formatResponseBody(res.body, state.rawMode).split('\n')` instead of `res.body.split('\n')`. Keep the status line and (verbose) header line measurements unchanged. Ensure `formatResponseBody` is imported (it is already imported at the top of `reducer.ts` per the existing `import { formatResponseBody } from './formatter'` — verify and add if missing).
- [ ] 1.2 Verify the `getMaxRequestLineWidth` and `getMaxDetailsLineWidth` functions are NOT modified (they already measure rendered text).

## 2. Tests for `getMaxResponseLineWidth` formatted-body measurement

- [ ] 2.1 Add a `compactJsonResponse` fixture to `test/helpers/responses.ts`: a `ResponseData` with `body` set to a single-line valid JSON string (e.g. `'{"id":"1","name":"Willy","active":true}'`) whose `JSON.parse` + `JSON.stringify(..., null, 2)` expansion yields multiple shorter lines, the longest of which is shorter than the raw line.
- [ ] 2.2 In `test/core/horizontal-scroll-boundary.test.ts`, add a test asserting `getMaxResponseLineWidth(state)` with `compactJsonResponse` and `rawMode: false` returns the longest **formatted** line length (not the raw line length). Compute the expected value by calling `formatResponseBody(body, false)` in the test and taking `Math.max(...lines.map(l => l.length))`.
- [ ] 2.3 In `test/core/horizontal-scroll-boundary.test.ts`, add a test asserting `getMaxResponseLineWidth(state)` with `compactJsonResponse` and `rawMode: true` returns the longest **raw** line length (unchanged behavior — `formatResponseBody(body, true)` returns body verbatim).

## 3. Tests for `SCROLL_HORIZONTAL` response bound (h/l step scroll)

- [ ] 3.1 In `test/core/horizontal-scroll-boundary.test.ts`, add a test: state with `compactJsonResponse`, `rawMode: false`, `focusedPanel: 'response'`, `responseHorizontalOffset` already at the formatted-bound `max(0, formattedMaxLine - contentWidth)`. Dispatch `SCROLL_HORIZONTAL { direction: 'right', columns: 80 }`. Assert `responseHorizontalOffset` does NOT exceed the formatted bound (i.e. the step scroll cannot overshoot into empty content).
- [ ] 3.2 Add a test: starting from `responseHorizontalOffset: 0`, dispatch `SCROLL_HORIZONTAL { direction: 'right' }` repeatedly against `compactJsonResponse` in non-raw mode and assert the offset plateaus at the formatted bound, never reaching the raw-line length.

## 4. Tests for `JUMP_HORIZONTAL` response bound ($ jump-to-end)

- [ ] 4.1 In `test/core/edge-jump.test.ts`, add a test: state with `compactJsonResponse`, `rawMode: false`, `wrapMode: 'nowrap'`, `focusedPanel: 'response'`. Dispatch `JUMP_HORIZONTAL { direction: 'end', columns: 80 }`. Assert `responseHorizontalOffset` equals `max(0, formattedMaxLine - responseContentWidth)` where `formattedMaxLine` is the longest formatted line — NOT the raw line length. This is the regression test for the reported bug (body vanishing on `$`).
- [ ] 4.2 Add a test: same fixture but `rawMode: true`. Assert `responseHorizontalOffset` equals `max(0, rawMaxLine - responseContentWidth)` (unchanged raw-mode behavior).
- [ ] 4.3 Add a test: `compactJsonResponse`, `rawMode: false`, `wrapMode: 'wrap'`, `focusedPanel: 'response'`. Dispatch `JUMP_HORIZONTAL { direction: 'end', columns: 80 }`. Assert state is returned unchanged (wrap-mode guard still holds).

## 5. Verify existing tests still pass

- [ ] 5.1 Run `npm run test` and confirm all pre-existing tests in `test/core/horizontal-scroll-boundary.test.ts` and `test/core/edge-jump.test.ts` still pass (the `longResponse` fixture is `'x'.repeat(200)`, not valid JSON, so `formatResponseBody` returns it unchanged — no behavior change expected).
- [ ] 5.2 Run `npm run lint` and confirm no new lint errors in `src/core/reducer.ts`.
- [ ] 5.3 Run `lsp_diagnostics` on `src/core/reducer.ts` to confirm no type errors (especially that `formatResponseBody` is correctly imported and the `state.rawMode` access type-checks).
