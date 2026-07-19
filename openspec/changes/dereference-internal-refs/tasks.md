## 1. Implementation

- [ ] 1.1 Implement `dereferenceDoc(doc: any): void` in `src/core/openapi-parser.ts` — a recursive walker that traverses the parsed JSON document in place, replaces every internal `$ref` (`#/...`) with its target via the existing `resolveRef` helper, and recurses into object values and array elements. Include a `visited: Set<string>` parameter that is path-scoped (add on entry, delete on exit) for cycle detection. Leave external `$ref` stubs in place (the existing call-site warning behavior continues to fire).
- [ ] 1.2 Add a defensive `depth` counter to `dereferenceDoc`'s recursion (warn and stop at depth > 100) to guard against stack overflow on pathological specs.
- [ ] 1.3 Implement the cycle warning: when `visited.has(node.$ref)`, call `logger.warn(\`Circular $ref "${node.$ref}" — stop resolving\`)` and return the node unchanged.
- [ ] 1.4 Call `dereferenceDoc(doc)` from `parseOpenApiSpec` after `JSON.parse(content)` and the shape/Swagger-2.0 validation guards, before `extractBaseUrl` and the path iteration loop.
- [ ] 1.5 Verify that the existing `resolveRef` and `resolveSchema` helpers remain unchanged — they continue to serve as defensive single-hop resolvers and external-ref warners. No edits needed to the 4 existing call sites.

## 2. Test Fixtures

- [ ] 2.1 Create `test/fixtures/openapi-nested-refs.json` — the "Order API" sample from the exploration: a requestBody schema with `$ref` to `CreateOrderRequest`, which has properties including `customer` (ref to sub-schema without top-level example), `shipping` (ref to sub-schema WITH top-level example), `currency` (inline primitive with example), and `metadata` (ref to sub-schema WITH top-level example). After dereferencing, the synthesized body should be `{"shipping":{...},"currency":"USD","metadata":{...}}` — verifies that sub-schemas with top-level `example` are picked up while sub-schemas with only per-property examples are still omitted (deferred to follow-up).
- [ ] 2.2 Create `test/fixtures/openapi-ref-chain.json` — three-deep chain `A → B → C` where C has a top-level `example`. The synthesized body should be C's example.
- [ ] 2.3 Create `test/fixtures/openapi-circular-ref.json` — schema A references B, B references A. Should produce a cycle warning and an empty body, but parsing completes without throwing.
- [ ] 2.4 Create `test/fixtures/openapi-self-cycle.json` — schema A references itself. Should produce a cycle warning and an empty body.
- [ ] 2.5 Create `test/fixtures/openapi-diamond-ref.json` — schema `Order` has properties `billing` and `shipping`, both referencing `Address`. Should resolve both with NO cycle warning (path-scoped visited set).
- [ ] 2.6 Create `test/fixtures/openapi-external-ref-unaffected.json` — a spec mixing internal and external `$ref`. Internal refs resolve; external refs continue to warn at the call site (no double-warning from `dereferenceDoc`).

## 3. Tests

- [ ] 3.1 Add a `describe('parseOpenApiSpec - recursive $ref resolution')` block in `test/core/openapi-parser.test.ts` covering all new fixtures: ref chain resolution, nested property ref with top-level example, requestBody $ref resolution, parameter schema $ref resolution, diamond (no warning), external ref (still warns).
- [ ] 3.2 Add a `describe('parseOpenApiSpec - circular $ref guard')` block covering direct self-cycle, indirect cycle, acyclic nested (no warning), and mixed (cyclic operation does not suppress acyclic operation).
- [ ] 3.3 Add a test asserting that a fully-dereferenced flat spec (no nested refs) produces identical output to today — regression guard.
- [ ] 3.4 Add a test asserting that `examples/spring-boot-api-service-openapi.json` still produces the same request count, names, methods, and URLs as before (regression guard on a real-world spec).
- [ ] 3.5 Verify cycle-warning message text matches the spec exactly: `Circular $ref "<ref>" — stop resolving`.

## 4. Validation

- [ ] 4.1 Run `npm run lint` — no new lint errors.
- [ ] 4.2 Run `npm test` — all existing tests pass; new tests pass.
- [ ] 4.3 Run `npx tsc --noEmit` — type-check clean.
- [ ] 4.4 Manually verify by running `httptui` against `examples/spring-boot-api-service-openapi.json` — request list and bodies look identical to before (regression check).

## 5. Spec Sync

- [ ] 5.1 After implementation is complete and tests pass, run `/opsx-sync` to merge the delta spec into `openspec/specs/openapi-import/spec.md`.
- [ ] 5.2 Verify the merged spec has both new requirements ("Resolve nested `$ref` recursively across the document" and "Detect and guard circular `$ref`") with all scenarios intact.
