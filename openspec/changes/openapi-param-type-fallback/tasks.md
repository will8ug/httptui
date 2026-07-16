## 1. Core Implementation

- [ ] 1.1 Add scalar `schema.type` fallback in `resolveParamValue()` in `src/core/openapi-parser.ts` (lines 84-90). After the `schema.example` check and before the final `return ''`, add: if `typeof schema.type === 'string'`, return `String(schema.type)`. This naturally skips array-valued types (nullable unions like `["string","null"]`) since `typeof [...] === 'object'`. Do not add `format` handling. Do not touch `extractBaseUrl()` or `processRequestBody()`.

## 2. Test Updates

- [ ] 2.1 Split the test at `test/core/openapi-parser.test.ts` line 207 (`'maps path parameter with no default or example to empty string'`) into two tests: (a) `'maps path parameter with type but no default or example to type value'` — input `{ name: 'id', in: 'path', schema: { type: 'integer' } }`, expect `{ name: 'id', value: 'integer' }`; (b) `'maps path parameter with no schema to empty string'` — input `{ name: 'id', in: 'path' }` (no schema), expect `{ name: 'id', value: '' }`.
- [ ] 2.2 Update the header test at line 250 (`'maps header parameter with no default'`): change the assertion at line 255 from `value: ''` to `value: 'string'` (the fixture `openapi-params.json` defines `X-Trace-Id` with `{ type: "string" }`). Rename the test to `'maps header parameter with type but no default'`.
- [ ] 2.3 Update the cookie test at line 268 (`'combines single cookie parameter into Cookie header'`): change the assertion at line 283 from `value: ''` to `value: 'string'` (the test defines `session` with `schema: { type: 'string' }`).
- [ ] 2.4 Add a new test `'maps path parameter with nullable union type to empty string'` in the path parameters describe block: input `{ name: 'id', in: 'path', schema: { type: ['string', 'null'] } }`, expect `{ name: 'id', value: '' }`.

## 3. Verification

- [ ] 3.1 Run `npm test` (or `npx vitest run`) and confirm all tests pass with zero failures.
- [ ] 3.2 Run `lsp_diagnostics` on `src/core/openapi-parser.ts` and confirm no new errors or warnings introduced by the change.
