## 1. Prerequisite Check

- [x] 1.1 Verify `dereference-internal-refs` change is merged and `openspec status --change "dereference-internal-refs"` shows complete. This change MUST NOT be implemented before that.
- [x] 1.2 Verify the existing test suite passes after `dereference-internal-refs` is merged (baseline regression check).

## 2. Implementation

- [x] 2.1 Implement `synthesizeExample(schema: any, doc: any, depth = 0): any` in `src/core/openapi-parser.ts` — a recursive helper with the following dispatch:
  - Return `undefined` if `schema` is falsy or `depth > 50` (defensive guard, log a warning).
  - If `schema.example !== undefined`: return it (Tier 3 passthrough).
  - If `schema.default !== undefined`: return it (primitive default fallback).
  - Switch on `schema.type`:
    - `'object'`: iterate `schema.properties` (omit if absent → `undefined`), recursively call `synthesizeExample` on each property's schema, omit properties returning `undefined`, return the object (or `undefined` if no properties produced a value).
    - `'array'`: recursively call `synthesizeExample` on `schema.items`, wrap the result in a single-element array if non-`undefined`, else `undefined`.
    - Primitive types (`'string'`, `'integer'`, `'number'`, `'boolean'`): return `undefined` (no example or default → omit).
    - Default: return `undefined`.
- [x] 2.2 Implement `flattenToUrlencoded(value: any, prefix: string): string` helper that converts a nested object/array structure into urlencoded pairs:
  - Primitive value → `${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`
  - Object → for each `[key, val]`, recurse with prefix `${prefix}[${key}]`
  - Array → for each `val`, recurse with prefix `${prefix}` (repeated keys)
  - Empty result → return empty string
- [x] 2.3 Refactor `processRequestBody` in `src/core/openapi-parser.ts`: replace the inline Tier 4 block (lines 287–308) with `const synthesized = synthesizeExample(resolvedSchema, doc); if (synthesized !== undefined) { ... }`. The body serialization branches: `application/json` uses `JSON.stringify(synthesized)`; `application/x-www-form-urlencoded` uses `flattenToUrlencoded(synthesized, '')` joined by `&`.
- [x] 2.4 Verify the existing `serializeExample` helper (line 96) is still used for Tiers 1/2/3 — those tiers pass through verbatim and don't need recursion.
- [x] 2.5 Verify no edits are needed to `resolveRef` or `resolveSchema` — the synthesizer assumes the document is already dereferenced (it does not call those helpers).

## 3. Test Fixtures

- [x] 3.1 Create `test/fixtures/openapi-nested-object-examples.json` — the "Order API" shape from the exploration, with `Order` having properties `currency` (inline primitive with example), `customer` (sub-object with only per-property examples), `shipping` (sub-object with top-level `example`), `metadata` (sub-object with top-level `example`). After this change, the synthesized body should be `{"currency":"USD","customer":{"name":"Alice","email":"alice@example.com"},"shipping":{"street":"123 Main St","city":"Springfield"},"metadata":{"source":"web"}}` (compare to `dereference-internal-refs` which produced `{"shipping":{...},"currency":"USD","metadata":{...}}` — `customer` is now also picked up).
- [x] 3.2 Create `test/fixtures/openapi-array-of-refs.json` — a requestBody with `schema.type: "array"` and `items.$ref` to a schema with per-property examples. Should produce `[{"sku":"W-001","quantity":2}]`.
- [x] 3.3 Create `test/fixtures/openapi-array-of-primitives.json` — a requestBody with `schema.type: "array", items: { type: "string", example: "priority" }`. Should produce `["priority"]`.
- [x] 3.4 Create `test/fixtures/openapi-deeply-nested.json` — 3+ levels of nested object schemas, each with per-property examples. Should produce a fully-nested object.
- [x] 3.5 Create `test/fixtures/openapi-urlencoded-nested.json` — a urlencoded schema with nested object property and array property. Should produce `name=John&address[city]=SF&tags=vip`.
- [x] 3.6 Create `test/fixtures/openapi-external-ref-stub.json` — a schema with a property that has `{ "$ref": "./external.json#/Foo" }` (left as stub by deref pass). The property should be omitted from the synthesized body.

## 4. Tests

- [x] 4.1 Add a `describe('parseOpenApiSpec - recursive body synthesis')` block in `test/core/openapi-parser.test.ts` covering: nested object synthesis (uses `openapi-nested-object-examples.json`), array of refs, array of primitives, deeply-nested (3+ levels), primitive property with `default` (no example), external `$ref` stub omitted, composition keyword (`allOf`) produces no body.
- [x] 4.2 Add a `describe('parseOpenApiSpec - urlencoded nested encoding')` block covering: nested object uses bracket notation, array uses repeated keys, mixed nested + array.
- [x] 4.3 Add a regression test asserting that flat schemas (e.g., `openapi-body-ref.json`, `openapi-urlencoded.json`) produce identical output to before this change. (Flat synthesis is a degenerate case of recursive synthesis.)
- [x] 4.4 Add a test asserting that the defensive depth guard fires for a synthetically-cyclic schema (manually construct a cyclic object reference in the test, since the deref pass would have broken any real cycle — this tests the synthesizer's own safety net in isolation).
- [x] 4.5 Verify that `examples/spring-boot-api-service-openapi.json` still produces the same request count, names, methods, and URLs as before (regression on a real-world flat spec).

## 5. Validation

- [x] 5.1 Run `npm run lint` — no new lint errors.
- [x] 5.2 Run `npm test` — all existing tests pass; new tests pass.
- [x] 5.3 Run `npx tsc --noEmit` — type-check clean.
- [x] 5.4 Manually verify by running `httptui` against `test/fixtures/openapi-nested-object-examples.json` — the POST request body shows the fully-nested `{"currency":"USD","customer":{...},"shipping":{...},"metadata":{...}}` structure.

## 6. Spec Sync

- [x] 6.1 After implementation is complete and tests pass, run `/opsx-sync` to merge the delta spec into `openspec/specs/openapi-import/spec.md`.
- [x] 6.2 Verify the merged spec has the modified "Synthesize request body from examples" requirement with all new scenarios (nested object, array of refs, array of primitives, deeply nested, primitive with default, urlencoded nested, urlencoded array, external stub, composition keyword) intact alongside the original scenarios.
