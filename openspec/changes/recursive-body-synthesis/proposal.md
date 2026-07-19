## Why

The `dereference-internal-refs` change (prerequisite) resolves all internal `$ref` in the parsed document before request extraction. After dereferencing, the existing Tier 4 body synthesis still only collects top-level `prop.example` from each property of an `type: "object"` schema. Sub-schemas that have only per-property examples (no top-level `example`) are still silently dropped, and `type: "array"` schemas continue to produce no body at all. Real-world OpenAPI specs (Stripe, GitHub, OpenAPI Generator output) routinely nest objects and use arrays of `$ref` — without this change, those specs still produce empty or partial request bodies for the most useful fields.

## What Changes

- Refactor the existing Tier 4 flat-object synthesis (lines 287–308 of `src/core/openapi-parser.ts`) into a recursive `synthesizeExample(schema, doc)` helper that:
  - Returns `schema.example` verbatim if present (Tier 3 behavior, unchanged).
  - For `type: "object"` schemas: iterates `schema.properties` and recursively synthesizes each property's value. Properties whose synthesis returns `undefined` are omitted. Flat-object behavior (current Tier 4) is a degenerate case of recursion (properties with inline `.example` return that example directly; properties that are themselves object schemas recurse).
  - For `type: "array"` schemas: synthesizes a single example item from `schema.items` (recursively) and wraps it in `[...]`. If the item synthesis returns `undefined`, the array is omitted (no body).
  - For primitive schemas (`type: "string" | "integer" | "boolean" | "number"`) with `example`/`default`: returns the example/default value (extends existing parameter-value resolution rule to body synthesis).
  - Returns `undefined` for any other shape (no example, no properties, no items, external `$ref` stub left by deref pass).
- Replace the inline Tier 4 block in `processRequestBody` with a call to `synthesizeExample(resolvedSchema, doc)`. Tier 1, 2, 3, 5 behavior is unchanged.
- For `application/x-www-form-urlencoded` content type: nested objects are flattened using bracket notation (`lineItems[0][sku]=W-001&lineItems[0][quantity]=2`). Arrays of primitives use repeated keys (`tags=priority&tags= rush`). This is a conservative encoding that round-trips with most server-side parsers (Express, Spring `@ModelAttribute`, etc.).
- **Out of scope** (deferred to a follow-up change): `allOf`/`anyOf`/`oneOf`/`not` composition keywords. These remain a known limitation — a schema with `allOf: [{ $ref: ... }, { $ref: ... }]` continues to produce no body. Documented in design.

## Capabilities

### New Capabilities
<!-- None — this change extends the existing `openapi-import` capability. -->

### Modified Capabilities
- `openapi-import`: Broadens the "Synthesize request body from examples" requirement to cover (a) recursive nested-object synthesis (Tier 4 becomes recursive rather than flat) and (b) array-of-`items` synthesis (Tier 4 now handles `type: "array"` instead of falling through to "no body"). Adds explicit handling for nested urlencoded encoding.

## Impact

- **Prerequisite**: This change depends on `dereference-internal-refs` being implemented first. The recursive synthesizer assumes the document is already dereferenced — it does not re-implement `$ref` resolution. External `$ref` stubs left by the deref pass are treated as "no example → omitted". This change MUST NOT be implemented before `dereference-internal-refs` is merged.
- **Code**: `src/core/openapi-parser.ts` — new `synthesizeExample(schema, doc)` recursive helper (replaces lines 287–308); `processRequestBody` calls it in the Tier 4 position; new `flattenToUrlencoded(value, prefix)` helper for nested urlencoded serialization. The existing Tier 1/2/3/5 logic is unchanged.
- **Specs**: `openspec/specs/openapi-import/spec.md` — the "Synthesize request body from examples" requirement is broadened to cover recursion and arrays. New scenarios for nested object synthesis, array-of-`items` synthesis, and nested urlencoded encoding.
- **Tests**: `test/core/openapi-parser.test.ts` — new test cases for: nested object with per-property examples, array of refs, array of primitives, deeply-nested (3+ levels), urlencoded with nested objects, cycle guard interaction (cycles left by deref pass are still safely omitted).
- **New fixtures**: `test/fixtures/openapi-nested-object-examples.json`, `test/fixtures/openapi-array-of-refs.json`, `test/fixtures/openapi-urlencoded-nested.json`.
- **No public API changes**: `parseOpenApiSpec` signature and `ParseResult` shape are unchanged.
- **No new dependencies**: continues to use manual JSON parsing.
- **Backward compatibility**: All existing tests continue to pass. Flat-object synthesis (current Tier 4) is a degenerate case of recursive synthesis — properties with inline `.example` still produce identical output. The only behavioral change is that previously-empty bodies for nested/array schemas now have content, which is strictly additive.
- **Performance**: Recursive synthesis is O(n) in the size of the synthesized example, bounded by the depth of nesting. Typical specs produce small example bodies (< 1 KB); negligible cost.
