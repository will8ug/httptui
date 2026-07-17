## Context

The OpenAPI parser (`src/core/openapi-parser.ts`) resolves request body values via `processRequestBody()` (lines 224-313), which uses a 5-tier cascade: content-level example → named examples → schema-level example → per-property synthesis → no body. Tier 4 (lines 287-308) synthesizes a flat JSON object from object-type schema properties, but only collects properties that have an `example` field. Properties with only `type` (or only `default`) are silently skipped, causing `hasAny` to stay false and the body to fall through to `undefined`.

A previous change (`openapi-param-type-fallback`) added a `schema.type` fallback to `resolveParamValue()` (line 90-92) for path/query/header/cookie parameters, but explicitly excluded `processRequestBody()` as a non-goal. The user's original intent was for the type fallback to apply to all similar parameter locations, including request body properties.

## Goals / Non-Goals

**Goals:**
- Surface `prop.default` and scalar `prop.type` as placeholder values in Tier 4 synthesis when `prop.example` is absent, mirroring the `resolveParamValue()` cascade (`example → default → type → skip`).
- Resolve property-level `$ref` before checking for value sources, so `$ref`-referenced properties behave identically to inline properties. Uses the existing `resolveSchema()` helper — 1 line change.
- Keep the change tightly scoped to the Tier 4 synthesis loop in `processRequestBody()`. No other tiers or functions are touched.

**Non-Goals:**
- Nested object/array recursion. A property with `type: "object"` or `type: "array"` produces the type string as a placeholder (e.g. `"nested": "object"`), not a recursively synthesized sub-object. This matches the trade-off accepted in the previous change.
- Changing top-level non-object schemas. `schema: { type: "string" }` (no `properties`) still returns `body: undefined`. Tier 4 only fires for `type: "object"` with `properties`.
- Changing Tiers 1-3 (content-level example, named examples, schema-level example). Those already work correctly.
- Producing type-valid values. The type string is an explicit placeholder the user must replace, not a usable default — same semantics as `resolveParamValue()`.

## Decisions

### Decision 1: Mirror the `resolveParamValue()` cascade for per-property values

**Choice**: Tier 4 per-property value resolution becomes `example → default → scalar type → skip`.

**Rationale**: `resolveParamValue()` already uses this exact cascade (`default → example → type`) for path/query/header/cookie parameters. Including `default` alongside `example` and `type` makes the two code paths consistent. The previous change established the type-as-placeholder pattern; this change extends it to the remaining code path.

**Note on ordering**: `resolveParamValue()` checks `default` before `example`. In Tier 4, `example` is checked first (preserving existing behavior for properties that have both), then `default`, then `type`. This is intentional — the existing Tier 4 already prioritized `example`, and changing the priority would alter behavior for the rare case where a property has both `default` and `example`.

### Decision 2: Resolve property `$ref` using existing `resolveSchema()` helper

**Choice**: Replace `const prop = propSchema as any;` with `const prop = resolveSchema(propSchema, doc) as any;` in the Tier 4 loop.

**Rationale**: `resolveSchema()` (line 64-72) already exists and handles `$ref` resolution by traversing `#/components/...` paths. Without this, any property defined as `{ "$ref": "#/components/schemas/Foo" }` is silently skipped because the `$ref` wrapper object has no `example`/`default`/`type` fields. The change is 1 line and uses an existing helper — zero new complexity. A `$ref` to an object schema produces `"prop": "object"` (the type string), consistent with the "no nested recursion" non-goal.

**Alternatives considered**:
- *Skip `$ref` resolution entirely*: rejected — real-world OpenAPI specs commonly use `$ref` on object properties; without resolution, the type fallback would silently miss these properties, defeating the purpose.

### Decision 3: Scalar string type guard, same as previous change

**Choice**: Apply the type fallback only when `typeof prop.type === 'string'`.

**Rationale**: Identical to Decision 1 in the previous `openapi-param-type-fallback` change. OpenAPI 3.1 nullable unions (`type: ["string", "null"]`) are naturally skipped because `typeof [...] === 'object'`. OpenAPI 3.0's `type: "string", nullable: true` keeps `type` as a scalar `"string"`, correctly producing the placeholder `"string"`.

### Decision 4: No nested object/array recursion

**Choice**: Properties with `type: "object"` or `type: "array"` produce the type string as a placeholder value (e.g. `"nested": "object"`).

**Rationale**: Recursive synthesis of nested objects adds significant complexity (cycle detection, depth limits, mixed type handling) for marginal benefit. The type string signals "fill me in" at the use site, which is the same placeholder semantics as the previous change. The user explicitly confirmed this is out of scope for now.

## Risks / Trade-offs

- **[Risk] Existing tests assert `secret` is omitted** → Mitigation: the test "omits properties without examples in synthesis" (line 539) and "synthesizes flat object from per-property examples" (line 532) are updated to reflect the new behavior (`secret` with `{ type: "string" }` now produces `"secret":"string"`).
- **[Risk] `type: "object"` or `type: "array"` produce odd placeholders** → Accepted. Same trade-off as the previous change. Request body object properties realistically use string/integer/number/boolean; object/array properties are less common and the placeholder still signals "fill me in".
- **[Risk] Property `$ref` to a schema with no resolvable type** → Mitigation: `resolveSchema()` returns `undefined` for unresolvable refs; the `if (!prop) continue;` guard skips the property, falling through to the existing "no body" path. No crash.
- **[Trade-off] `example` is checked before `default` in Tier 4** → Accepted. This preserves existing behavior for properties with both fields. `resolveParamValue()` checks `default` first, but changing Tier 4's priority would be a behavioral change beyond the scope of this fix.
