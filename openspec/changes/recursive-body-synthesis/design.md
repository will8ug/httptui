## Context

The prerequisite change `dereference-internal-refs` introduces a `dereferenceDoc(doc)` pass that resolves all internal `$ref` references in-place before request extraction. After dereferencing, the existing Tier 4 body synthesis in `processRequestBody` (lines 287–308 of `src/core/openapi-parser.ts`) still has two gaps:

1. **Flat-only synthesis**: Tier 4 iterates `schema.properties` and collects `prop.example` directly. When a property is itself an object schema with only per-property examples (no top-level `example`), `prop.example` is `undefined` and the property is omitted. Nested objects like `{"customer":{"name":"Alice"}}` are never produced.

2. **No array handling**: Tier 4 only matches `schema.type === 'object'`. An `type: "array"` schema falls through to Tier 5 (no body), even when `items` has rich examples. Real-world APIs routinely use array-of-`$ref` request bodies (bulk create, batch update).

The spring-boot example in `examples/spring-boot-api-service-openapi.json` uses flat schemas (DemoItem, FormSubmission with simple properties), so it doesn't exercise these gaps. But larger specs (Stripe, GitHub, OpenAPI Generator output) routinely do.

## Goals / Non-Goals

**Goals:**
- Synthesize example bodies for `type: "object"` schemas **recursively** — when a property is itself an object schema with per-property examples, build a nested object.
- Synthesize example bodies for `type: "array"` schemas — build a single-element array `[{...example...}]` from `items`.
- Extend the per-property value resolution rule (already used for parameters: `example` → `default` → scalar `type` → empty) to body property synthesis, so primitive properties without explicit examples fall back to `default` or the type name.
- Serialize nested urlencoded bodies with bracket notation (`key[prop]=value`) and repeated keys for arrays (`key=val1&key=val2`).
- Preserve all existing Tier 1/2/3/5 behavior unchanged.
- Preserve all existing test behavior — flat-object synthesis is a degenerate case of recursive synthesis (a flat object is just a recursive object with no nested-object properties).

**Non-Goals:**
- **Composition keywords** (`allOf` / `anyOf` / `oneOf` / `not`): not in scope. A schema with `allOf: [{ $ref: ... }, { properties: ... }]` continues to produce no body. Deferred to a follow-up change. These are the natural next pain point after recursive synthesis.
- **Multiple example items for arrays**: only one example item is synthesized per array (no inference of additional items from `minItems`/`maxItems`). This matches the "one example is enough to demo the API" use case.
- **Schema composition via `default` for object types**: object schemas without any examples (no top-level `example`, no per-property `example` or `default`) still produce no body. We don't synthesize empty objects `{}`.
- **External `$ref` resolution**: external refs are left as stubs by the deref pass and treated as `undefined` here (omitted). Unchanged.
- **Responses**: the parser still ignores OpenAPI responses; this change does not add response handling.

## Decisions

### Decision 1: Single recursive `synthesizeExample(schema, doc)` helper

**Choice**: One function with a switch on `schema.type`:

```
synthesizeExample(schema, doc):
  if !schema: return undefined
  if schema.example !== undefined: return schema.example       // Tier 3 passthrough
  if schema.default !== undefined: return schema.default        // primitive default fallback
  switch schema.type:
    case 'object':
      if !schema.properties: return undefined
      obj = {}
      hasAny = false
      for [name, propSchema] of Object.entries(schema.properties):
        val = synthesizeExample(propSchema, doc)
        if val !== undefined:
          obj[name] = val
          hasAny = true
      return hasAny ? obj : undefined
    case 'array':
      if !schema.items: return undefined
      item = synthesizeExample(schema.items, doc)
      return item !== undefined ? [item] : undefined
    case 'string' | 'integer' | 'number' | 'boolean':
      // primitive with no example/default: fall through to undefined
      // (DO NOT return the type name as a string — that's surprising for body values)
      return undefined
    default:
      return undefined
```

**Rationale**:
- One function, ~30 LOC. Replaces the inline 22-line Tier 4 block.
- Switch-on-type is the OpenAPI-standard dispatch (vs. ad-hoc `if` ladders).
- Each branch is independently testable.

**Alternatives considered**:
- Separate `synthesizeObject`, `synthesizeArray`, `synthesizePrimitive` functions: more code, harder to follow recursion. Rejected.
- Visitor pattern: overkill for a single helper. Rejected.
- Returning type names for primitives without examples (e.g., `"string"`): surprising — produces bodies like `{"name":"string"}` which look like example data but aren't. Rejected. Better to omit and let the user fill in.

### Decision 2: External `$ref` stubs left by deref pass are treated as `undefined`

**Choice**: The synthesizer does not call `resolveRef` or `resolveSchema`. It assumes the document is already dereferenced. If it encounters a `{ "$ref": "./external.json#/Foo" }` stub (left by the deref pass because external refs are unsupported), `schema.example` is `undefined`, `schema.type` is `undefined`, the switch falls to `default → undefined`. The property is omitted.

**Rationale**:
- The deref pass already handles internal `$ref`. Duplicating that logic in the synthesizer violates separation of concerns.
- External refs are warned about by the call-site `resolveRef` (unchanged). The synthesizer doesn't need to warn again.
- This is why `dereference-internal-refs` is a hard prerequisite: without the deref pass, internal `$ref` stubs would also be treated as `undefined` and synthesis would silently produce nothing.

### Decision 3: Cycle safety comes from the deref pass, not the synthesizer

**Choice**: The synthesizer does not maintain its own visited set. After the deref pass, internal cycles are already broken (replaced with stubs + warnings). The synthesizer walks what it's given; if a stub somehow survives (bug in deref, or external `$ref` to a cyclic external doc), the synthesizer's recursion naturally terminates because the stub has no `properties`/`items`/`example`.

**Rationale**:
- Avoids duplicate cycle-detection logic.
- A defensive `depth` counter (warn + stop at depth > 50) is added as a belt-and-suspenders guard against pathological schemas. Body examples are typically < 5 levels deep; 50 is a generous safety margin.

**Alternative considered**: A synthesizer-side visited set keyed by object identity. Rejected as redundant — the deref pass already handles cycles, and the synthesizer doesn't follow `$ref` so there's no cycle mechanism in its recursion.

### Decision 4: Urlencoded nested encoding uses bracket notation

**Choice**: For `application/x-www-form-urlencoded` content type, nested objects are flattened using bracket notation, arrays use repeated keys:

```
Input object: { name: "John", address: { city: "SF", zip: "94102" }, tags: ["vip", "rush"] }
Output: name=John&address[city]=SF&address[zip]=94102&tags=vip&tags=rush
```

**Rationale**:
- Bracket notation (`address[city]=SF`) is the most widely-supported nested-encoding among server-side parsers:
  - Express.js with `body-parser` extended mode: ✓
  - Spring `@ModelAttribute` with nested objects: ✓
  - Rails `Hash` parameters: ✓
  - PHP `$_POST` with nested keys: ✓
- Repeated keys for arrays (`tags=vip&tags=rush`) is the standard form for non-bracket arrays and is parsed correctly by Express, Spring, and most URI parsers.
- This is a conservative encoding — servers that don't support nested keys will see `address[city]` as a flat key name, which is harmless (the request still sends, just doesn't bind to a nested object).

**Alternatives considered**:
- JSON-in-form-field (`data=%7B%22address%22%3A...%7D`): some APIs use this (e.g., Stripe), but it requires the server to JSON-decode a specific field. Not a general solution.
- Dot notation (`address.city=SF`): less universally supported than brackets.
- RFC 6570 form-style encoding: more correct but less widely supported.

### Decision 5: Composition keywords (`allOf`/`anyOf`/`oneOf`/`not`) explicitly out of scope

**Choice**: A schema with `allOf`/`anyOf`/`oneOf` produces `undefined` (no body), same as today. The synthesizer's switch only matches `object`/`array`/primitive types; composition keywords have no `type` field at the top level, so they fall to the `default` branch.

**Rationale**:
- Composition keyword semantics are non-trivial: `allOf` requires merging schemas, `anyOf` requires picking one (which?), `oneOf` requires picking exactly one. Implementing these well is a separate, larger change.
- After dereferencing, `allOf: [{ $ref: "..." }]` becomes `allOf: [{ resolved schema }]` — but the synthesizer still doesn't know how to merge multiple object schemas. This needs its own design (deep-merge rules, conflict resolution).
- Deferred to a follow-up change. The current behavior (no body for composition-keyword schemas) is preserved — no regression.

## Risks / Trade-offs

- **Risk**: The synthesizer recurses into deeply-nested object schemas and blows the call stack.
  **Mitigation**: Defensive depth counter (warn + return `undefined` at depth > 50). Real-world specs rarely nest bodies beyond 5 levels.

- **Risk**: The bracket-notation urlencoded encoding is rejected by servers that strictly enforce `application/x-www-form-urlencoded` semantics.
  **Mitigation**: Documented as the chosen encoding in the spec. Users who need a different encoding can edit the saved `.http` file. This is a tradeoff — the alternative (no nested urlencoded body) is strictly worse.

- **Risk**: Synthesizing an example object for a property that has `type: "object"` but no `properties` (just a free-form object) produces `undefined` (correct) but might surprise users who expect `{}`.
  **Mitigation**: The "no body" outcome is consistent with the existing Tier 5 behavior for `type: "string"` schemas without examples. Free-form objects have no example data to draw from — `undefined` is the right answer.

- **Risk**: Existing tests that assert specific body JSON shapes might break if those shapes change due to recursive synthesis.
  **Mitigation**: All existing Tier 4 tests use flat schemas (DemoItem, FormSubmission with simple properties). Recursive synthesis produces identical output for flat schemas. No test changes expected; new tests are added for nested/array cases.

- **Trade-off**: Arrays synthesize exactly ONE example item, even when `minItems` is set. This might under-represent required array lengths.
  **Mitigation**: Documented in the spec. One example item is sufficient to demo an API. If users need more, they can edit the saved `.http` file.

- **Trade-off**: Primitive properties without `example` or `default` produce `undefined` (omitted), not a type-name placeholder like `"string"`. This means a `User` schema with `name: { type: "string" }` (no example) produces `{}` → no body, rather than `{"name":"string"}`.
  **Mitigation**: This matches the existing parameter-value resolution rule (which DOES fall back to type name for parameters). The asymmetry is intentional: parameter values go into URL placeholders (`?name={{name}}`) where the user explicitly fills in a real value; body properties are inline JSON where a `"string"` placeholder would look like real data. Different contexts, different rules.

## Migration Plan

This change is purely additive on top of `dereference-internal-refs`:

1. Verify `dereference-internal-refs` is merged and all its tests pass.
2. Implement `synthesizeExample(schema, doc)` and `flattenToUrlencoded(value, prefix)`.
3. Replace the Tier 4 block in `processRequestBody` with a call to `synthesizeExample`.
4. Update the urlencoded serialization branch to use `flattenToUrlencoded`.
5. Run the existing test suite — all tests pass unchanged (flat schemas produce identical output).
6. Add new test fixtures and test cases for nested objects, arrays, and nested urlencoded.
7. Update `openspec/specs/openapi-import/spec.md` with the modified requirement.

**Rollback**: Revert the commit. No data or config changes to undo.

## Open Questions

None — the design is fully specified for the in-scope items. The deferred items (composition keywords) are explicit non-goals and would be a separate change proposal. The encoding choice for nested urlencoded (bracket notation) is a deliberate decision, not an open question.
