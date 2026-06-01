## 1. Data Model

- [ ] 1.1 Add `FormDataParam` type to `src/core/types.ts` with `key` (string), `value` (string), and `type` ('text' | 'file') fields
- [ ] 1.2 Add optional `formdataFields?: FormDataParam[]` to `ParsedRequest` interface
- [ ] 1.3 Add optional `formdataFields?: FormDataParam[]` to `ResolvedRequest` interface

## 2. Postman Parser

- [ ] 2.1 Update `convertBody()` in `src/core/postman-parser.ts` to populate `formdataFields` when body mode is `formdata` and all params are text type
- [ ] 2.2 Keep existing warning and skip behavior for formdata with file fields (lines 159-165)
- [ ] 2.3 Remove `ensureUrlEncodedContentType` call for formdata mode — no longer inject `Content-Type: application/x-www-form-urlencoded`
- [ ] 2.4 Update the Content-Type override logic (lines 333-345) to skip formdata mode
- [ ] 2.5 Add test fixture: create `test/fixtures/postman-formdata-text.json` with a collection containing formdata body mode with text fields
- [ ] 2.6 Add test fixture: create `test/fixtures/postman-formdata-mixed.json` with a collection containing formdata body mode with both text and file fields
- [ ] 2.7 Add test cases to `test/postman-parser.test.ts`: text-only formdata → `formdataFields` populated with correct key/value/type
- [ ] 2.8 Add test case: formdata with file fields → warning logged, `formdataFields` undefined

## 3. Executor

- [ ] 3.1 Update `executeRequest()` in `src/core/executor.ts` to build a `FormData` object when `resolvedRequest.formdataFields` is populated
- [ ] 3.2 Append each field's key and value to the `FormData` object using `formData.append(key, value)`
- [ ] 3.3 Pass the `FormData` object as `body` to `undici.request()` instead of string body
- [ ] 3.4 Remove the manual Content-Type injection path — undici auto-generates `multipart/form-data; boundary=...` for FormData bodies
- [ ] 3.5 Add test cases to `test/executor.test.ts`: formdata body produces multipart request

## 4. Variable Resolution

- [ ] 4.1 Update `resolveVariables()` in `src/core/variables.ts` to iterate over `formdataFields` and resolve `{{var}}` placeholders in field values
- [ ] 4.2 Field keys SHALL NOT be resolved (only values) per spec
- [ ] 4.3 Add test case: `{{variable}}` in formdata field value is resolved correctly
- [ ] 4.4 Add test case: `{{variable}}` in formdata field key is NOT resolved

## 5. Request Detail Display

- [ ] 5.1 Update `RequestDetailsView.tsx` to render formdata fields as `key=value` lines when `formdataFields` is populated
- [ ] 5.2 Render formdata lines after headers and separator, before (or instead of) raw body text
- [ ] 5.3 Apply horizontal scrolling support to formdata field lines (consistent with existing body line rendering)

## 6. Spec Sync

- [ ] 6.1 Run `openspec sync` to merge delta specs into main specs
- [ ] 6.2 Verify `openspec/specs/postman-collection-import/spec.md` reflects the updated formdata behavior
- [ ] 6.3 Verify `openspec/specs/formdata-body/spec.md` is created in main specs

## 7. Verification

- [ ] 7.1 Run `npm run lint` and fix any issues
- [ ] 7.2 Run `npm test` — all existing tests pass, new tests pass
- [ ] 7.3 Run `npm run build` — TypeScript compilation succeeds
- [ ] 7.4 Manual smoke test: load a Postman collection with formdata text fields, verify correct multipart encoding in request