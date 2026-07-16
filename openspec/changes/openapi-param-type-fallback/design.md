## Context

The OpenAPI parser (`src/core/openapi-parser.ts`) resolves a value for each path/query/header/cookie parameter via `resolveParamValue()` (lines 74-91). The current cascade is `schema.default → schema.example → ""`. When neither `default` nor `example` is present, the emitted `FileVariable` gets an empty string value, leaving `{{varName}}` placeholders with no hint about the parameter's expected type.

The existing `openapi-import` spec (created today) codifies this rule across four requirements (path, query, header, cookie parameters), each referencing "the variable value resolution rule".

## Goals / Non-Goals

**Goals:**
- Surface the declared `schema.type` as a placeholder value when no `default`/`example` exists, so saved `.http` files and the TUI show a meaningful hint (e.g. `"integer"`, `"string"`) instead of an empty value.
- Keep the change tightly scoped to `resolveParamValue()` — the single function all four parameter kinds flow through.

**Non-Goals:**
- Cascading to `schema.format` (e.g. `uuid`, `date-time`). Deliberately excluded — type alone is sufficient as a placeholder.
- Changing server template variable resolution (`extractBaseUrl()`) — server variables use `default`/`enum`, not `schema.type`.
- Changing request body synthesis (`processRequestBody()`) — bodies use a separate example cascade with no `schema.type` field.
- Producing type-valid values (e.g. a real integer for `type: integer`). The type string is an explicit placeholder, not a usable default — the user is expected to replace it.

## Decisions

### Decision 1: Use `schema.type` only when it is a scalar string

**Choice**: Apply the type fallback only when `typeof schema.type === 'string'`.

**Rationale**: OpenAPI 3.1 allows nullable unions expressed as `type: ["string", "null"]`. Naively calling `String(["string","null"])` would produce the ugly placeholder `"string,null"`. Restricting to scalar strings naturally skips array-valued types without inspecting their contents — a simpler, more robust guard.

OpenAPI 3.0's `type: "string", nullable: true` keeps `type` as a scalar `"string"`, so it correctly produces the placeholder `"string"`. No special handling needed.

**Alternatives considered**:
- *Use the first element of an array type* (e.g. `["string","null"]` → `"string"`): rejected — adds array inspection logic for a rare case, and `"string"` for a nullable field is no more useful than `""` as a placeholder.
- *Join with `|`* (`"string|null"`): rejected — verbose and noise.

### Decision 2: No `format` cascade

**Choice**: Do not fall back to `schema.format` (e.g. `uuid`, `date-time`, `binary`).

**Rationale**: `format` is only meaningful alongside `type: string`, and the type placeholder already signals "fill me in". Adding format would create a longer cascade and questions about format/type precedence, for marginal benefit. The user explicitly scoped this out.

### Decision 3: Scope to `resolveParamValue()` only

**Choice**: Do not touch `extractBaseUrl()` (server variables) or `processRequestBody()` (request bodies).

**Rationale**: Server variables (`servers[].variables[]`) have no `schema.type` field — they use `default` and `enum`. Request body synthesis uses a five-tier example cascade on `content`/`schema` with no parameter-style `type` field. Neither code path has a `schema.type` to fall back to, so the change naturally doesn't apply. Scoping here keeps the blast radius to one function.

### Decision 4: Type placeholder is a hint, not a default

**Choice**: Document that the type-derived value is a placeholder the user must replace, not a valid default that can be sent as-is.

**Rationale**: For `type: "integer"`, sending `"integer"` as a path segment would likely 400. The value exists to make the parameter's type visible at the `{{varName}}` use site and in exported `.http` files, prompting the user to substitute a real value. This matches the existing semantics of `default`/`example` (which are also just pre-filled values the user can override).

## Risks / Trade-offs

- **[Risk] Type-as-value looks valid but isn't** → Mitigation: documented as a placeholder. The variable is still wrapped in `{{varName}}` so it won't be sent until resolved; the TUI and `.http` save flow already treat `FileVariable.value` as an editable default.
- **[Risk] Existing tests assert empty-string for type-only params** → Mitigation: the breaking test is split into two (one for type fallback, one for no-schema/empty). The fixture `openapi-params.json`'s `X-Trace-Id` header parameter (`{ type: "string" }`) changes from `""` to `"string"` and its asserting test is updated.
- **[Trade-off] `type: "object"` or `type: "array"` produce odd placeholders** → Accepted. Path/query/header/cookie parameters realistically only use string/integer/number/boolean. Object/array params are rare and the placeholder still signals "fill me in", which is better than empty.
