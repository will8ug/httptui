## 1. Data Model

- [x] 1.1 Add `FormDataParam` type to `src/core/types.ts` with `key` (string), `value` (string), and `type` ('text' | 'file') fields
- [x] 1.2 Add optional `formdataFields?: FormDataParam[]` to `ParsedRequest` interface
- [x] 1.3 Add optional `formdataFields?: FormDataParam[]` to `ResolvedRequest` interface

## 2. Postman Parser

- [x] 2.1 Update `convertBody()` in `src/core/postman-parser.ts` to populate `formdataFields` when body mode is `formdata` and all params are text type
- [x] 2.2 Keep existing warning and skip behavior for formdata with file fields (lines 159-165)
- [x] 2.3 Remove `ensureUrlEncodedContentType` call for formdata mode — no longer inject `Content-Type: application/x-www-form-urlencoded`
- [x] 2.4 Update the Content-Type override logic (lines 333-345) to skip formdata mode
- [x] 2.5 Add test fixture: create `test/fixtures/postman-formdata-text.json` with a collection containing formdata body mode with text fields
- [x] 2.6 Add test fixture: create `test/fixtures/postman-formdata-mixed.json` with a collection containing formdata body mode with both text and file fields
- [x] 2.7 Add test cases to `test/postman-parser.test.ts`: text-only formdata → `formdataFields` populated with correct key/value/type
- [x] 2.8 Add test case: formdata with file fields → warning logged, `formdataFields` undefined

## 3. Executor

- [x] 3.1 Update `executeRequest()` in `src/core/executor.ts` to build a `FormData` object when `resolvedRequest.formdataFields` is populated
- [x] 3.2 Append each field's key and value to the `FormData` object using `formData.append(key, value)`
- [x] 3.3 Pass the `FormData` object as `body` to `undici.request()` instead of string body
- [x] 3.4 Remove the manual Content-Type injection path — undici auto-generates `multipart/form-data; boundary=...` for FormData bodies
- [x] 3.5 Add test cases to `test/executor.test.ts`: formdata body produces multipart request

## 4. Variable Resolution

- [x] 4.1 Update `resolveVariables()` in `src/core/variables.ts` to iterate over `formdataFields` and resolve `{{var}}` placeholders in field values
- [x] 4.2 Field keys SHALL NOT be resolved (only values) per spec
- [x] 4.3 Add test case: `{{variable}}` in formdata field value is resolved correctly
- [x] 4.4 Add test case: `{{variable}}` in formdata field key is NOT resolved

## 5. Request Detail Display

- [x] 5.1 Update `RequestDetailsView.tsx` to render formdata fields as `key=value` lines when `formdataFields` is populated
- [x] 5.2 Render formdata lines after headers and separator, before (or instead of) raw body text
- [x] 5.3 Apply horizontal scrolling support to formdata field lines (consistent with existing body line rendering)

## 6. Spec Sync

- [x] 6.1 Run `openspec archive` to merge delta specs into main specs (done at archive time)
- [x] 6.2 Verify `openspec/specs/postman-collection-import/spec.md` reflects the updated formdata behavior
- [x] 6.3 Verify `openspec/specs/formdata-body/spec.md` is created in main specs

## 7. Verification

- [x] 7.1 Run `npm run lint` and fix any issues
- [x] 7.2 Run `npm test` — all existing tests pass, new tests pass
- [x] 7.3 Run `npm run build` — TypeScript compilation succeeds
- [ ] 7.4 Manual smoke test: load a Postman collection with formdata text fields, verify correct multipart encoding in request

## 8. Content-Type Header UX Fix

- [x] 8.1 Update `postman-parser.ts` to inject `Content-Type: multipart/form-data` header for formdata mode (informational for display)
- [x] 8.2 Update `executor.ts` to strip Content-Type header when building FormData body (let undici auto-generate boundary)
- [x] 8.3 Add `removeContentTypeHeader` helper function in `executor.ts`
- [x] 8.4 Update delta spec `postman-collection-import/spec.md`: text-only formdata scenario includes Content-Type header
- [x] 8.5 Update delta spec `formdata-body/spec.md`: add Content-Type lifecycle requirement (inject in parser, strip in executor)
- [x] 8.6 Update existing test: verify formdata request includes `Content-Type: multipart/form-data` in parsed headers
- [x] 8.7 Update existing test: verify executor strips Content-Type when sending FormData body