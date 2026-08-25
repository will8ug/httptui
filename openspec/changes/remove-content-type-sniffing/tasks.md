## 1. Remove JSON Content-Type sniffing from the executor

- [x] 1.1 In `src/core/executor.ts`, remove the `shouldAddJsonContentType` block from the raw-body branch so a raw body is sent with the request's headers verbatim (form-data branch unchanged).
- [x] 1.2 Remove the now-unused `shouldAddJsonContentType` import from `src/core/executor.ts`.

## 2. Remove JSON Content-Type emission from the serializer

- [x] 2.1 In `src/core/curl-serializer.ts`, remove the `shouldAddJsonContentType` block so `--data-raw`/`--form-string` are emitted with the request's headers verbatim.
- [x] 2.2 Remove the now-unused `shouldAddJsonContentType` import from `src/core/curl-serializer.ts`.

## 3. Delete the dead helper

- [x] 3.1 Delete `shouldAddJsonContentType` from `src/core/headers.ts` (no remaining call sites).

## 4. Update tests

- [x] 4.1 Update `test/core/executor.test.ts`: a JSON-looking body with no explicit `Content-Type` now sends no `Content-Type` header.
- [x] 4.2 Update `test/core/curl-serializer.test.ts`: a JSON-looking body no longer gains `-H 'Content-Type: application/json'`.

## 5. Verification

- [x] 5.1 Run `openspec validate remove-content-type-sniffing --strict` and fix any delta-format issues.
- [x] 5.2 Run the full test suite, lint, and typecheck; confirm no regressions beyond the intended removal of `Content-Type` synthesis.
