## Why

OpenAPI specs commonly use nested `$ref` chains (e.g., a request body schema whose properties are themselves `$ref` pointers to other schemas, which may again reference further schemas). The current parser resolves `$ref` at exactly one level — four scattered call sites each call `resolveRef`/`resolveSchema` once. When a referenced schema's properties contain `$ref`, those nested refs are never followed, so sub-schemas with top-level `example` fields are silently dropped from synthesized request bodies. Real-world APIs (Spring Boot generated specs, OpenAPI Generator output, etc.) routinely produce this shape, so users importing them get empty or partial request bodies with no warning.

## What Changes

- Introduce a single **dereference pass** that walks the parsed JSON document before request extraction, replacing every internal `$ref` (`#/...`) with its target object in-place. External and remote `$ref` continue to be logged as warnings and left unresolved.
- Implement **cycle detection** with a hard guard: when a `$ref` is encountered that is already on the current resolution path, the parser logs a warning (`Circular $ref "<ref>" — stop resolving`) and leaves the `$ref` stub in place. Downstream code treats the unresolved stub as before (no example → omitted from synthesis).
- Refactor the four existing call sites (`resolveParamValue`, `processRequestBody` body ref, `processRequestBody` schema ref, `buildRequest` param ref) to rely on the pre-dereferenced document. The single-hop `resolveSchema` helper is retained only as a defensive no-op for any residual external refs; it no longer needs to be called for internal refs.
- The existing **Tier 4 flat object synthesis** (per-property `example` collection) is unchanged — it now naturally picks up sub-schemas with top-level `example` fields because they are no longer hidden behind a `$ref` stub.
- **Out of scope**: recursive nested-object synthesis (synthesizing `{"customer":{"name":"Alice"}}` when the sub-schema has only per-property examples and no top-level `example`), array `items: { $ref }` synthesis, and `allOf`/`anyOf`/`oneOf` composition keyword handling. These are documented as known limitations and deferred to a follow-up change.

## Capabilities

### New Capabilities
<!-- None — this change extends an existing capability rather than introducing one. -->

### Modified Capabilities
- `openapi-import`: Extends the "Resolve internal `$ref` for parameters" requirement to cover nested/recursive `$ref` resolution across the entire document (parameters, request bodies, and schemas). Adds a new requirement for cycle detection with hard-guard semantics.

## Impact

- **Code**: `src/core/openapi-parser.ts` — new `dereferenceDoc(doc)` function called from `parseOpenApiSpec` after `JSON.parse`; the four existing `$ref` call sites are simplified (they continue to call `resolveRef`/`resolveSchema` defensively, but internal refs are already resolved by the time they run). The `resolveRef` and `resolveSchema` helpers are kept as-is for external-ref warning behavior.
- **Specs**: `openspec/specs/openapi-import/spec.md` — the "Resolve internal `$ref` for parameters" requirement is broadened to cover recursive resolution; a new "Detect and guard circular `$ref`" requirement is added.
- **Tests**: `test/core/openapi-parser.test.ts` — new test cases for nested ref resolution (ref chains, sub-schema with top-level example), circular ref guarding, and a fixture `test/fixtures/openapi-nested-refs.json` exercising the deeper shapes.
- **No public API changes**: `parseOpenApiSpec` signature and `ParseResult` shape are unchanged.
- **No new dependencies**: continues to use manual JSON parsing with zero external libraries.
- **Performance**: dereference pass is O(n) in the size of the document (visits each node once). Negligible for typical spec sizes (< 1 MB).
- **Backward compatibility**: All existing tests continue to pass. The change is strictly additive — schemas that previously resolved correctly still resolve correctly, and additional schemas now resolve correctly too.
