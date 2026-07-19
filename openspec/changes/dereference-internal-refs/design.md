## Context

`src/core/openapi-parser.ts` resolves internal `$ref` at four call sites (`resolveParamValue`, `processRequestBody` body ref, `processRequestBody` schema ref, `buildRequest` param ref). Each resolves exactly one level. When the resolved target contains further `$ref` (in property schemas, nested objects, or ref chains like `A → B → C`), those nested refs are never followed, so sub-schemas with top-level `example` fields are silently dropped from synthesized bodies.

Real-world OpenAPI specs (Spring Boot generated, OpenAPI Generator output) routinely produce nested `$ref` shapes. The current parser produces empty or partial request bodies for these without warning. See `examples/spring-boot-api-service-openapi.json` for a flat-ref example; deeper nesting is common in larger specs.

The existing `openspec/specs/openapi-import/spec.md` requirement "Resolve internal $ref for parameters" specifies first-level internal resolution and external warning behavior. The implementation already resolves `$ref` in more places than the spec mentions (request bodies, schemas), but neither spec nor code handle nesting.

## Goals / Non-Goals

**Goals:**
- Resolve internal `$ref` references of arbitrary depth across the entire parsed document — parameters, request bodies, schema properties, and ref chains.
- Detect circular `$ref` and stop with a warning, leaving the unresolved `$ref` stub in place.
- Preserve all existing behavior for flat specs (no regressions).
- Keep the change small and localized to `openapi-parser.ts` — no new dependencies, no public API changes.

**Non-Goals:**
- Recursive **nested object synthesis** — when a sub-schema has only per-property examples (no top-level `example`), the property is still omitted from the synthesized body. (Deferred to a follow-up change.)
- **Array `items: { $ref }` synthesis** — arrays in requestBody schemas continue to fall through to "no body" (Tier 5). (Deferred; only useful once nested object synthesis is also done.)
- **Composition keywords** (`allOf` / `anyOf` / `oneOf` / `not`) — not in scope. These remain a known limitation.
- **External `$ref` resolution** — external refs (file paths, URLs, non-`#/` shapes) continue to be logged as warnings and left unresolved.
- **Responses** — the parser ignores OpenAPI responses; dereferencing does not change this.

## Decisions

### Decision 1: Pre-dereference the whole document in a single pass

**Choice**: Add a `dereferenceDoc(doc)` pass that walks the parsed JSON tree once before request extraction, replacing every internal `$ref` (`#/...`) with its target object. The four existing `$ref` call sites continue to call `resolveRef`/`resolveSchema` defensively, but for internal refs these become no-ops (already resolved).

**Alternatives considered**:

- **A. Loop in `resolveSchema`** (follow ref chains at call site): Smallest diff, but only follows ref chains *along the schema chain* (`schema.$ref → schema.$ref`). Does NOT help when a schema's *property* is `{ "$ref": ... }` — the property is still a `$ref` stub at synthesis time. Rejected: too narrow.

- **B. Pre-dereference the whole doc** (chosen): Walks the entire tree once, replaces all `$ref` in-place. Existing synthesis code (Tier 4 flat object collection) works unchanged — sub-schemas with top-level `example` are now visible because they're no longer hidden behind a `$ref` stub. Clean separation: dereferencing is orthogonal to request extraction.

- **C. Recursive synthesis** (rebuild example objects by walking into properties): Most faithful output (produces nested objects like `{"customer":{"name":"Alice"}}`), but more code, more test cases, and creates pressure to also handle arrays (otherwise nested arrays are still empty). Deferred to a follow-up change.

**Rationale for B**: B subsumes A's benefit (ref chains) and additionally fixes the "sub-schema with top-level example" case (e.g., `shipping` and `metadata` in the Order sample). It does not fix the "sub-schema with only per-property examples" case (e.g., `customer`) — that needs C, which is deferred. B is a strict prerequisite for C anyway (C is cleaner over a dereferenced doc than over a ref-laden one).

### Decision 2: Mutate the parsed document in place

**Choice**: `dereferenceDoc` mutates the `doc` object in place rather than deep-cloning first.

**Rationale**:
- `doc` is private to `parseOpenApiSpec` — created by `JSON.parse(content)` at the top of the function and never returned to callers. No aliasing concerns.
- Deep-cloning a typical spec (hundreds of KB) wastes memory for no safety benefit.
- Mutating in place keeps the function signature simple: `dereferenceDoc(doc: any): void`.

**Alternative considered**: Deep clone via `structuredClone(doc)` before dereferencing. Rejected as unnecessary; if `doc` ever escapes `parseOpenApiSpec`, revisit.

### Decision 3: Cycle detection with hard guard (stop + warn)

**Choice**: A `visited: Set<string>` tracks `$ref` strings on the current resolution path. When a `$ref` is re-encountered, the parser:
1. Logs a warning: `Circular $ref "<ref>" — stop resolving`
2. Stops recursing into that branch
3. Leaves the `$ref` stub in place (downstream treats as "no example → omitted")

**Rationale**: User's explicit choice. Hard guard is the simplest, most predictable option. A soft guard (best-effort continuation) would produce ambiguous output for cyclic specs and is harder to test. The warning surfaces the issue without crashing.

**Implementation detail**: The `visited` set is **path-scoped**, not global. When the recursion exits a branch, the ref is removed from `visited` so the same sub-schema can be referenced from sibling branches without a false-positive cycle warning. (E.g., `Order` and `Invoice` both reference `Customer` — that's a diamond, not a cycle.)

```
dereferenceNode(node, doc, visited):
  if node is not object: return node
  if node.$ref:
    if visited.has(node.$ref):
      warn(`Circular $ref "${node.$ref}" — stop resolving`)
      return node   // leave stub
    visited.add(node.$ref)
    target = resolveRef(node.$ref, doc)
    if target is undefined:   // external ref
      return node              // resolveRef already warned
    resolved = dereferenceNode(target, doc, visited)
    visited.delete(node.$ref)
    return resolved
  // non-$ref object: recurse into each value
  for [key, value] of Object.entries(node):
    node[key] = dereferenceNode(value, doc, visited)
  return node
```

### Decision 4: Run the dereference pass between `JSON.parse` and path iteration

**Choice**: Call `dereferenceDoc(doc)` immediately after `JSON.parse(content)` and the basic shape-validation guards, before `extractBaseUrl` and the path iteration loop.

**Rationale**: Single integration point — impossible to miss for any future caller of `parseOpenApiSpec`. All four existing `$ref` call sites naturally benefit. The existing `resolveRef`/`resolveSchema` helpers are kept unchanged for their secondary role: warning on external refs (which `dereferenceDoc` leaves as stubs, so the call sites still encounter them and still warn).

### Decision 5: Keep `resolveRef` and `resolveSchema` as-is

**Choice**: The existing helpers remain unchanged. They become effectively no-ops for internal refs (the `$ref` is already gone by the time they run), but still serve external-ref warning duty.

**Rationale**: Avoids touching 4 call sites. Defensive coding — if `dereferenceDoc` has a bug that leaves a `$ref` in place, the call sites still resolve it single-hop (current behavior) rather than failing entirely. Net risk reduction.

## Risks / Trade-offs

- **Risk**: Mutation corrupts shared sub-objects when the same schema is referenced from multiple places (diamond shape).
  **Mitigation**: The dereferenced sub-object is plain JSON data — read-only consumers (synthesis, parameter extraction) never mutate it. No corruption path exists in the current code. If future code mutates resolved schemas, revisit with a clone strategy.

- **Risk**: Deeply nested specs blow the JS call stack during recursive `dereferenceNode`.
  **Mitigation**: Real-world OpenAPI specs rarely exceed 20 levels of nesting. JS default stack is ~10K frames. Add a defensive depth counter (`if (depth > 100) { warn; return node }`) as a belt-and-suspenders guard.

- **Risk**: Path-scoped `visited` set still allows exponential blowup on heavily-shared schemas (e.g., a `Money` schema referenced from 1000 properties).
  **Mitigation**: Each reference is resolved independently (path-scoped), so `Money` is dereferenced 1000 times. For typical specs this is fast (sub-millisecond). If it becomes a problem, add a separate memoization cache keyed by `$ref` string. Defer until measured.

- **Risk**: Tests that assert specific warning strings for external refs may break if `dereferenceDoc` also logs warnings.
  **Mitigation**: `dereferenceDoc` only logs the cycle warning. External-ref warnings stay in `resolveRef` (called by the existing call sites). No double-warning: `dereferenceDoc` leaves external `$ref` stubs in place, the call site encounters the stub and calls `resolveRef`, which warns exactly as today.

- **Trade-off**: Specs with sub-schemas that have only per-property examples (no top-level `example`) still produce empty bodies after this change. This is a known limitation — the recursive synthesis (Approach C) is deferred. Users will see improvement for the "top-level example on sub-schema" case but not the "per-property examples only" case. Documented in the proposal and design.

## Migration Plan

No migration required. The change is purely additive to internal behavior:

1. Implement `dereferenceDoc(doc)` and call it from `parseOpenApiSpec`.
2. Run the existing test suite — all tests should pass unchanged.
3. Add new test fixtures and test cases for nested refs, ref chains, and cycles.
4. Update `openspec/specs/openapi-import/spec.md` with the new requirements (handled via the specs delta in this change).

**Rollback**: Revert the commit. No data or config changes to undo.

## Open Questions

None — the design is fully specified for the in-scope items. The deferred items (nested object synthesis, array handling, composition keywords) are explicit non-goals and would be a separate change proposal.
