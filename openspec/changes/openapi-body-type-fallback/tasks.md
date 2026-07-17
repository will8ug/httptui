## 1. Core Implementation

- [ ] 1.1 In `src/core/openapi-parser.ts`, modify the Tier 4 property synthesis loop in `processRequestBody()` (lines 287-308). Replace the single `prop.example` check with a three-tier cascade: first `prop.example` (if `!== undefined`), then `prop.default` (if `!== undefined`), then `typeof prop.type === 'string'` (return `String(prop.type)`). Each branch sets `synthesized[propName]` and `hasAny = true`. Properties matching none of the three tiers are skipped (omitted).
- [ ] 1.2 In the same loop, replace `const prop = propSchema as any;` with `const prop = resolveSchema(propSchema, doc) as any;` to resolve property-level `$ref` before checking for value sources. Add `if (!prop) continue;` guard after the resolution. Do not add nested object/array recursion — `type: "object"` or `type: "array"` properties produce the type string as a placeholder value.
- [ ] 1.3 Do NOT touch Tiers 1-3, `resolveParamValue()`, `extractBaseUrl()`, or any other function. The change is scoped to the Tier 4 loop only.

## 2. Test Updates

- [ ] 2.1 Update the test "synthesizes flat object from per-property examples" (line 532) in `test/core/openapi-parser.test.ts`: change the assertion from `{"id":1,"name":"Widget","description":"A widget"}` to `{"id":1,"name":"Widget","description":"A widget","secret":"string"}` (the `secret` property in `openapi-body-ref.json` has `{ type: "string" }` and now produces `"secret":"string"` via the type fallback).
- [ ] 2.2 Rewrite the test "omits properties without examples in synthesis" (line 539): rename to "uses type as placeholder for properties without example or default" and change the assertion from `expect(result.requests[0].body).not.toContain('secret')` to `expect(result.requests[0].body).toContain('"secret":"string"')`.
- [ ] 2.3 Add a new test "synthesizes body from type-only properties" in the request body describe block: input schema `{ type: "object", properties: { templateId: { type: "string" } } }`, expect body `{"templateId":"string"}`.
- [ ] 2.4 Add a new test "uses property default when no example present" in the request body describe block: input schema `{ type: "object", properties: { count: { type: "integer", default: 0 } } }`, expect body `{"count":0}`.
- [ ] 2.5 Add a new test "resolves property $ref before value lookup" in the request body describe block: input schema with a property `{ "$ref": "#/components/schemas/UserRef" }` where `UserRef` is `{ type: "string", example: "alice" }`, expect body `{"user":"alice"}`.
- [ ] 2.6 Add a new test "resolves property $ref with type only" in the request body describe block: input schema with a property `{ "$ref": "#/components/schemas/TemplateId" }` where `TemplateId` is `{ type: "string" }`, expect body `{"templateId":"string"}`.
- [ ] 2.7 Add a new test "skips property with nullable union type" in the request body describe block: input schema `{ type: "object", properties: { optional: { type: ["string", "null"] } } }`, expect body `undefined` (no property matches any tier, `hasAny` stays false).
- [ ] 2.8 Verify the test "returns undefined body when no examples exist" (line 546) still passes unchanged — it uses a top-level `{ type: "string" }` schema (non-object), which does not enter Tier 4 and remains `undefined`.

## 3. Verification

- [ ] 3.1 Run `npm test` (or `npx vitest run`) and confirm all tests pass with zero failures.
- [ ] 3.2 Run `lsp_diagnostics` on `src/core/openapi-parser.ts` and confirm no new errors or warnings introduced by the change.
