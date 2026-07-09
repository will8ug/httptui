## 1. Format Detection

- [ ] 1.1 Extend `detectFormat()` in `src/core/postman-parser.ts` to return `'http' | 'postman' | 'openapi'` — check for top-level `openapi` or `swagger` string field before Postman checks
- [ ] 1.2 Add test for `detectFormat` with OpenAPI 3.x JSON, Swagger 2.0 JSON, Postman JSON, and `.http` file in `test/core/postman-parser.test.ts`

## 2. Core Parser — `src/core/openapi-parser.ts`

- [ ] 2.1 Create `src/core/openapi-parser.ts` with `parseOpenApiSpec(content: string): ParseResult` entry point — JSON.parse with error handling, Swagger 2.0 warning, empty paths handling
- [ ] 2.2 Implement server URL extraction → `@baseUrl` variable (handle `servers[0].url`, template variables with defaults, missing servers → empty string)
- [ ] 2.3 Implement path iteration — iterate `paths` keys, for each method key create one operation entry, skip unsupported methods with warning
- [ ] 2.4 Implement operation name assignment — `operationId` → `summary` → `"METHOD /path"`, with first tag prefix as `"Tag / name"`
- [ ] 2.5 Implement synthetic `lineNumber` assignment for unique React keys (incrementing 1, 2, 3...)
- [ ] 2.6 Implement URL construction — `{{baseUrl}}` + path with `{param}` → `{{param}}` replacement

## 3. Parameter Mapping

- [ ] 3.1 Implement internal `$ref` resolver (`#/components/parameters/...`, `#/components/schemas/...`) — traverse parsed JSON, return resolved object or undefined with warning for external refs
- [ ] 3.2 Implement path parameter mapping — replace `{name}` in URL with `{{name}}`, emit `FileVariable` with value from `schema.default` → `schema.example` → `""`
- [ ] 3.3 Implement query parameter mapping — append `?param={{param}}` / `&param={{param}}` to URL, emit `FileVariable` entries
- [ ] 3.4 Implement header parameter mapping — add `paramName: {{paramName}}` to headers, emit `FileVariable` entries
- [ ] 3.5 Implement cookie parameter mapping — combine into `Cookie: name1={{name1}}; name2={{name2}}` header, emit `FileVariable` entries

## 4. Security / Auth Mapping

- [ ] 4.1 Implement security scheme resolution — resolve operation-level `security` (override global), map scheme names to `components.securitySchemes`
- [ ] 4.2 Implement bearer auth → `Authorization: Bearer {{<schemeName>}}` header + empty `FileVariable`
- [ ] 4.3 Implement basic auth → `Authorization: Basic {{<schemeName>}}` header + empty `FileVariable`
- [ ] 4.4 Implement apiKey (header) → `<name>: {{<schemeName>}}` header + empty `FileVariable`
- [ ] 4.5 Implement apiKey (query) → append `<name>={{<schemeName>}}` to URL query string + empty `FileVariable`
- [ ] 4.6 Implement apiKey (cookie) → append to `Cookie` header + empty `FileVariable`
- [ ] 4.7 Implement unsupported scheme warning (oauth2, openIdConnect, mutualTLS) — log warning, skip auth

## 5. Request Body Synthesis

- [ ] 5.1 Implement content-type selection — prefer `application/json`, else first key from `requestBody.content`
- [ ] 5.2 Implement tier 1 body lookup — `content[mediaType].example` verbatim
- [ ] 5.3 Implement tier 2 body lookup — `content[mediaType].examples[firstKey].value` verbatim
- [ ] 5.4 Implement tier 3 body lookup — resolve schema `$ref`, use `schema.example` verbatim
- [ ] 5.5 Implement tier 4 body synthesis (Level 1) — flat object: collect `{ [name]: example }` for each property with `.example`, JSON.stringify
- [ ] 5.6 Implement urlencoded serialization — for `application/x-www-form-urlencoded`, serialize synthesized body as `key=val&...` with `encodeURIComponent`
- [ ] 5.7 Set `Content-Type` header from selected media type; skip body entirely if no `requestBody`

## 6. Webhooks & Edge Cases

- [ ] 6.1 Skip `webhooks` entries (no warning, no requests generated)
- [ ] 6.2 Handle spec with no `components` (parameters/schemas resolved inline only)
- [ ] 6.3 Handle spec with no `security` or `securitySchemes` (no auth headers)

## 7. Wire Into Dispatch Sites

- [ ] 7.1 Update `src/cli.tsx` — import `parseOpenApiSpec`, add `'openapi'` branch to the `detectFormat` ternary
- [ ] 7.2 Update `src/app.tsx` file-load handler (`o` key) — add `'openapi'` branch
- [ ] 7.3 Update `src/app.tsx` reload handler (`R` key) — add `'openapi'` branch

## 8. Test Fixtures & Unit Tests

- [ ] 8.1 Create `test/fixtures/openapi-basic.json` — single GET operation with no parameters
- [ ] 8.2 Create `test/fixtures/openapi-params.json` — path/query/header parameters with defaults and examples
- [ ] 8.3 Create `test/fixtures/openapi-auth.json` — bearer, basic, apiKey (header/query/cookie) security schemes
- [ ] 8.4 Create `test/fixtures/openapi-body-example.json` — content-level `example` and `examples`
- [ ] 8.5 Create `test/fixtures/openapi-body-ref.json` — schema `$ref` with per-property examples (springdoc pattern)
- [ ] 8.6 Create `test/fixtures/openapi-tags.json` — operations with tags for name prefixing
- [ ] 8.7 Create `test/fixtures/openapi-variables.json` — server template variables with and without defaults
- [ ] 8.8 Create `test/fixtures/openapi-empty.json` — spec with no paths
- [ ] 8.9 Create `test/fixtures/openapi-urlencoded.json` — urlencoded body with per-property examples
- [ ] 8.10 Create `test/core/openapi-parser.test.ts` — unit tests covering all fixtures and scenarios from spec.md
- [ ] 8.11 Add tests for warning output (external `$ref`, unsupported method, oauth2) — capture stderr, verify warning messages

## 9. Lint & Build Verification

- [ ] 9.1 Run `npm run lint` — fix any lint errors in new and modified files
- [ ] 9.2 Run `npm run build` — verify tsup builds successfully
- [ ] 9.3 Run `npm test` — verify all existing tests still pass and new tests pass
