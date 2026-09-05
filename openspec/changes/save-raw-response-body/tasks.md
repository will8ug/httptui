## 1. Executor: capture and expose rawBody

- [x] 1.1 Add required `rawBody: string` to `ResponseData` in `src/core/types.ts`; in `src/core/executor.ts` return the existing `rawBody` local alongside the normalized `body` and compute `size.bodyBytes` from `rawBody`. Verify with `npm run typecheck` and `npm run build`.
- [x] 1.2 Extend `test/executor.test.ts`: `rawBody` preserves CRLF, lone CR, and mixed line endings; `body` remains LF-only (existing normalization tests unchanged); `size.bodyBytes` equals the UTF-8 byte length of `rawBody` (greater than normalized for CRLF); `rawBody` equals `body` for LF-only bodies. Verify with `npx vitest run test/executor.test.ts`.

## 2. Save flow: write the raw body, refuse empty bodies

- [x] 2.1 In `src/app/input-handlers.ts` `handleResponseSaveInput`, write `state.response.rawBody` instead of `state.response.body` (no fallback, per design D2). Verify with `npm run typecheck`.
- [x] 2.2 Add a save-flow test: a response whose `rawBody` contains `\r\n` saves a file containing those `\r\n` sequences, while the panel still renders the LF-normalized body. Verify the new test plus existing save-response tests pass with `npx vitest run test/save-response.test.ts` (or the file hosting the response-save tests).
- [x] 2.3 Extend the `s` binding-site guard in `handleNormalInput` to also refuse when `state.response.rawBody` is empty, dispatching a transient message distinct from the no-response message (design D5). Add tests in `test/core/response-save.test.ts`: `s` on a displayed empty-body response (HEAD-style) shows the transient message and does not open the overlay; the no-response guard message is unchanged. Verify with `npx vitest run test/core/response-save.test.ts`.

## 3. Test sweep and full verification

- [x] 3.1 Update `test/helpers/responses.ts` `createMockResponse` to default `rawBody` consistently with `body`, then fix every `ResponseData` literal the compiler surfaces (`npm run typecheck:test`). Verify both typecheck scripts pass.
- [x] 3.2 Run the full suite and lint: `npm test` and `npm run lint` green. Confirm no rendering/search/wrap test needed changes (display behavior untouched by design).
