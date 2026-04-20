## 1. Implementation

- [x] 1.1 In `src/core/executor.ts`, after `const body = await response.body.text()` (currently line 113), normalize line endings with two passes: `.replace(/\r\n/g, '\n')` then `.replace(/\r/g, '\n')`. Assign to the same `body` variable (or a new `const normalizedBody`) and use it for both the `body` field and `Buffer.byteLength(body, 'utf-8')` in the `size.bodyBytes` computation so the reported size reflects the stored bytes.
- [x] 1.2 Verify no other changes are needed in `src/core/executor.ts` — the rest of the file stays intact, including error paths (which don't touch the body).

## 2. Unit tests — executor

- [x] 2.1 In `test/executor.test.ts`, add a test "normalizes CRLF line endings in response body" that mocks `response.body.text()` to resolve `"line1\r\nline2\r\nline3"` and asserts the returned `result.body === "line1\nline2\nline3"` and contains no `\r` character.
- [x] 2.2 Add a test "normalizes lone CR in response body" that mocks the body as `"line1\rline2\rline3"` and asserts `result.body === "line1\nline2\nline3"`.
- [x] 2.3 Add a test "normalizes mixed CRLF, CR, and LF line endings" with a body like `"a\r\nb\rc\nd\r\ne"` and asserts `result.body === "a\nb\nc\nd\ne"`.
- [x] 2.4 Add a test "leaves LF-only body byte-identical" that asserts a body of `"line1\nline2\n"` is returned unchanged.
- [x] 2.5 Add a test "handles empty body" that asserts a body of `""` is returned as `""`.
- [x] 2.6 Add a test "reports bodyBytes based on normalized body" — mock body `"a\r\nb"` (4 bytes), assert returned `body === "a\nb"` AND `size.bodyBytes === 3`.

## 3. Integration test — rendering

- [x] 3.1 In `test/integration/`, add a new file `crlf-body.test.tsx` that renders `<App>` via `renderApp(...)` with a mocked response whose body contains HTML-with-CRLF (e.g. `"<html>\r\n<body>\r\n  <h1>Hi</h1>\r\n</body>\r\n</html>"`).
- [x] 3.2 Trigger a request (press Enter) and wait for the response.
- [x] 3.3 Assert `lastFrame()` does NOT contain any `\r` character (`expect(frame).not.toMatch(/\r/)`).
- [x] 3.4 Assert each HTML line appears as a distinct rendered line (no stacking / overwriting).

## 4. Verification

- [x] 4.1 Run `npm run lint` and confirm no new errors.
- [x] 4.2 Run `npm run build` and confirm success.
- [x] 4.3 Run `npm test` and confirm all tests pass (including new executor and integration tests, and the `cli-smoke` test which requires `dist/cli.js`).
- [x] 4.4 Run `lsp_diagnostics` on `src/core/executor.ts` and confirm it is clean.
- [x] 4.5 Manual smoke test: run `httptui` against any endpoint returning HTML with CRLF (many default nginx/Apache pages qualify) and confirm the Response panel renders cleanly with no stacking.
  - Automated coverage is complete (6 executor unit tests + 1 integration test, all 250/250 pass).
  - A ready-to-use test file is at `examples/test-crlf.http` — run `node dist/cli.js examples/test-crlf.http`, press Enter on the request, and verify the Response panel shows clean HTML with no line stacking.
