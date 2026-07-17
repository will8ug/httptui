## Why

OpenAPI request body schemas with object properties that declare only a `type` (no `example`, no `default`) currently produce no body at all — `processRequestBody()` falls through to `undefined`. This mirrors the gap fixed for path/query/header/cookie parameters in the previous `openapi-param-type-fallback` change, but that change explicitly excluded `processRequestBody()`. The user's original intent was for the type fallback to apply to all similar parameters, including request body properties. A schema like `{ "type": "object", "properties": { "templateId": { "type": "string" } } }` should produce `{"templateId":"string"}` — a meaningful placeholder — instead of nothing.

## What Changes

- Extend the per-property value cascade in `processRequestBody()` Tier 4 to include `prop.default` and scalar `prop.type` as fallbacks, mirroring the cascade already in `resolveParamValue()`: `example → default → scalar type → skip`.
- Resolve property-level `$ref` before checking `example`/`default`/`type`, using the existing `resolveSchema()` helper — so `$ref`-referenced properties behave identically to inline properties.
- Constrain the type fallback to scalar string `type` values only, consistent with the previous change. Nullable unions (`type: ["string", "null"]`) are skipped naturally by the `typeof === 'string'` guard.
- No nested object/array recursion — `type: "object"` or `type: "array"` properties produce the type string as a placeholder value (e.g. `"nested": "object"`), not a recursively synthesized sub-object.
- No change to top-level non-object schemas — `schema: { type: "string" }` (no `properties`) still returns `body: undefined`.

## Capabilities

### New Capabilities
<!-- None. This change modifies an existing capability's behavior. -->

### Modified Capabilities
- `openapi-import`: The request body synthesis requirement (Tier 4 per-property cascade) changes from "example only, omit otherwise" to "example → default → scalar type → skip". Property `$ref` resolution is added so referenced schemas are dereferenced before checking for value sources.

## Impact

- **Code**: `src/core/openapi-parser.ts` — the `processRequestBody()` function (lines 287-308, Tier 4 synthesis loop). ~5 lines modified: replace the single `prop.example` check with a three-tier cascade and add `resolveSchema()` call for property `$ref` resolution.
- **Tests**: `test/core/openapi-parser.test.ts` — the test "omits properties without examples in synthesis" (line 539) changes behavior: `secret` with `{ type: "string" }` now produces `"secret":"string"` instead of being omitted. The test "synthesizes flat object from per-property examples" (line 532) assertion updates to include `"secret":"string"`. A new test covers the type-only-fallback case. The test "returns undefined body when no examples exist" (line 546, top-level `type: "string"`) is unchanged.
- **Fixtures**: No fixture file changes — `test/fixtures/openapi-body-ref.json` already has the `secret` property with `{ type: "string" }`; only the assertions change.
- **No runtime behavior change** for execution — synthesized body is still a string placed in `ParsedRequest.body`; only the default value differs.
- **No breaking API change** to `ParseResult` / `ParsedRequest` / `FileVariable` shapes.
