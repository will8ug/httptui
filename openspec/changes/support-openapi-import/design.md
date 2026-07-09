## Context

httptui currently parses `.http`/`.rest` files via a state-machine parser (`src/core/parser.ts`) and Postman Collection v2.1 JSON via `src/core/postman-parser.ts`. Both output `ParseResult { requests: ParsedRequest[], variables: FileVariable[] }`, which the entire execution pipeline — reducer, variable resolver, executor, UI — consumes.

OpenAPI 3.x is a schema-description format, not a request-list format. Unlike Postman collections (which contain concrete, ready-to-send requests), OpenAPI specs define operations with parameters that have no concrete values. The parser must synthesize `ParsedRequest` entries from the spec, projecting parameters onto `{{varName}}` placeholders backed by `FileVariable[]`.

The existing Postman import pattern (`postman-parser.ts`) is the architectural template: a pure function `parseXxx(content): ParseResult`, called from 3 dispatch sites that all use `detectFormat()`.

## Goals / Non-Goals

**Goals:**
- Parse OpenAPI 3.x JSON files into `ParseResult` with zero new dependencies
- Auto-detect OpenAPI format by content structure (top-level `openapi` field)
- Map path/query/header/cookie parameters to `{{varName}}` placeholders
- Populate variable values from `schema.default` → `schema.example` → empty `{{varName}}`
- Map server URL to `@baseUrl` file variable
- Map `bearerAuth`/`basicAuth`/`apiKey` security schemes to `{{varName}}` auth headers
- Synthesize flat object request bodies from per-property examples (Level 1)
- Resolve internal `$ref` (`#/components/...`) for parameters and schemas
- Flatten tags into request name prefixes (e.g., "Users / List users")
- Log warnings to stderr for unsupported features (external `$ref`, OAuth2, etc.)

**Non-Goals:**
- Swagger 2.0 support (different structure — deferred to a future change)
- YAML support (requires a new dependency — deferred)
- Inline parameter editing UI (the form-filling model from openapi-tui — future enhancement)
- Schema synthesis beyond flat objects (no nested objects, arrays, `oneOf`/`anyOf`/`allOf`)
- External or remote `$ref` resolution (requires file I/O or HTTP fetch)
- Webhooks (OpenAPI 3.1 incoming-event model — not sendable requests)
- Per-property `example` synthesis for nested objects or arrays
- Multiple server selection (only `servers[0]` is used; users swap via env files)
- New HTTP handling capabilities (no new auth methods, no new body types)

## Decisions

### Decision 1: Manual parser vs. OpenAPI SDK

**Chosen: Manual parser (zero dependencies).** The OpenAPI 3.x JSON structure is straightforward to parse manually: top-level `paths` → operations → parameters → requestBody. Internal `$ref` resolution is ~40 lines. Manual parsing keeps the dependency list clean (`postman-collection` is already the one external SDK) and gives full control over body synthesis.

**Alternative considered**: `@apidevtools/swagger-parser` (battle-tested, handles v2+v3+`$ref`+validation). Rejected because it adds ~200KB, pulls in more than needed, and over-validates. OpenAPI's JSON structure is simpler than Postman's SDK-specific accessors (`.members`, URL reconstruction, auth inheritance chains).

### Decision 2: Parameter-to-`{{varName}}` mapping

**Chosen: Emit `{{varName}}` placeholders in URL/headers, backed by `FileVariable[]`.** Each parameter (path, query, header, cookie) becomes a `{{varName}}` placeholder. The `FileVariable` value follows the rule:

```
if schema.default exists  → value = default
else if schema.example exists → value = example
else → value = "" (empty, shown as {{varName}} in the request)
```

This reuses httptui's existing `{{var}}` resolution system (`variables.ts`) and env file mechanism. Users fill values via env files (the `E` key switcher), which is httptui's equivalent of openapi-tui's global auth-value persistence.

**Alternative considered**: Structured parameter editor pane (like openapi-tui's `ParameterEditor`). Rejected for MVP — requires new UI components, new state shape, new reducer actions, and breaks the "everything is a flat request" invariant. Can be revisited as a future enhancement.

### Decision 3: Variable name derivation

**Chosen: Use the parameter name directly as the variable name.** Path param `id` → `{{id}}`, query param `limit` → `{{limit}}`, header param `X-Trace-Id` → `{{X-Trace-Id}}`. This keeps variable names predictable and recognizable. The `FileVariable.name` matches the OpenAPI parameter name verbatim.

**Alternative considered**: Prefix variable names with parameter location (e.g., `{{path_id}}`, `{{query_limit}}`). Rejected — adds noise and the request URL/headers already show the context.

### Decision 4: Auth placeholder mapping

**Chosen: Emit `{{varName}}` auth headers, reusing Postman's 3 auth types.** Security schemes are resolved from `components.securitySchemes` and applied based on operation-level or global `security` requirements:

| Security Scheme | Header Produced | Variable |
|---|---|---|
| `http` + `scheme: bearer` | `Authorization: Bearer {{bearerToken}}` | `@bearerToken = ` |
| `http` + `scheme: basic` | `Authorization: Basic {{basicAuth}}` | `@basicAuth = ` |
| `apiKey` + `in: header` | `<name>: {{<name>}}` | `@<name> = ` |
| `apiKey` + `in: query` | Added to URL as `?<name>={{<name>}}` | `@<name> = ` |
| `apiKey` + `in: cookie` | `Cookie: <name>={{<name>}}` | `@<name> = ` |
| `oauth2`, `openIdConnect`, `mutualTLS` | Skip with stderr warning | — |

The variable name for bearer/basic is derived from the security scheme name (e.g., scheme `bearerAuth` → `{{bearerAuth}}`). This avoids collisions when multiple bearer schemes exist.

**Alternative considered**: Skip auth entirely in MVP. Rejected — auth placeholders reuse the existing Postman `buildAuthHeaders` pattern with minimal code, and without them every secured request is incomplete.

### Decision 5: Body synthesis — Level 1 (flat object)

**Chosen: Multi-tier example lookup, with flat object synthesis as a fallback.** The body lookup order:

```
1. content[mediaType].example → use verbatim (complete example object)
2. content[mediaType].examples[firstKey].value → use verbatim
3. Resolve schema ($ref → components.schemas) → schema.example → use verbatim
4. If schema is type:object with properties having .example → synthesize flat object:
     for each property with .example: { [name]: example }
     (properties without .example are omitted)
   If content-type is application/x-www-form-urlencoded → serialize as key=val&...
   Else → JSON.stringify
5. Else body = undefined
```

Level 1 handles the most common real-world pattern (springdoc-openapi: flat objects with per-property `example` values, no schema-level `example`). It does NOT handle nested objects, arrays, `oneOf`/`anyOf`/`allOf`, or properties without examples.

**Alternative considered**: Level 0 (content-level example only, no synthesis). Rejected because the user's real-world springdoc spec (`http://127.0.0.1:8080/api-docs`) has no content-level examples — examples are scattered across properties. Level 0 would produce empty bodies for every request in that spec.

**Alternative considered**: Level 2 (nested objects + arrays). Rejected for MVP — adds ~60 lines of recursive logic and opens edge-case rabbit holes (array item examples, nested `$ref`, cycle detection). Can be revisited if real specs need it.

### Decision 6: Internal `$ref` resolution only

**Chosen: Resolve `#/components/...` references only.** External (`./file.json#/...`) and remote (`https://...`) `$ref` are logged as warnings and treated as unresolved (no default/example extracted, parameter/schema treated as empty).

Internal `$ref` resolution is needed for:
- `parameters[].$ref` → `#/components/parameters/...` (shared parameter definitions)
- `requestBody.content[...].schema.$ref` → `#/components/schemas/...` (body schema lookup)
- `schema.properties[].$ref` → `#/components/schemas/...` (nested, but only resolved for Level 1 flat object — nested refs in properties are skipped)

**Alternative considered**: External `$ref` via `@apidevtools/json-schema-ref-parser`. Rejected — adds a dependency and requires file I/O or network fetch, conflicting with httptui's offline terminal-tool ethos.

### Decision 7: Content-Type selection

**Chosen: Prefer `application/json` if present, otherwise first key.** When `requestBody.content` has multiple media types, the parser:
1. Checks for `application/json` → use it
2. Else uses the first key (iteration order from JSON.parse)

If the selected content type is `application/x-www-form-urlencoded`, the body is serialized as `key=val&...` (reusing the Postman urlencoded pattern). All other content types use the body string as-is (or JSON.stringify for synthesized objects).

### Decision 8: Format detection

**Chosen: Extend `detectFormat()` return type to `'http' | 'postman' | 'openapi'`.** Detection checks for top-level `openapi` field (string, e.g., `"3.0.3"`) in the parsed JSON. This is unambiguous — no other format uses this field.

```typescript
// Updated detectFormat logic (order matters)
function detectFormat(filePath, content): 'http' | 'postman' | 'openapi' {
  if (!filePath.toLowerCase().endsWith('.json')) return 'http';
  try {
    const parsed = JSON.parse(content);
    if (parsed?.openapi && typeof parsed.openapi === 'string') return 'openapi';
    if (parsed?.swagger && typeof parsed.swagger === 'string') return 'openapi'; // future: route to v2 parser
    if (parsed?.info?.schema?.toLowerCase().includes('postman')) return 'postman';
    if (parsed?.info && parsed?.item !== undefined) return 'postman';
  } catch { /* fall through */ }
  return 'http';
}
```

Note: `swagger` field (v2) is detected as `'openapi'` now, but the parser will warn and return empty results until v2 support is added. This prevents misrouting v2 specs to the `.http` parser.

### Decision 9: Operation name and tag prefixing

**Chosen: `operationId` → `summary` → `"METHOD /path"` fallback, with first tag as prefix.**

```
name = tags[0] ? `${tags[0]} / ${operationId || summary || "METHOD /path"}` 
              : `${operationId || summary || "METHOD /path"}`
```

This matches the Postman folder-flattening convention (`"Users / Create User"`) so the request list looks consistent regardless of import format.

### Decision 10: Server URL → `@baseUrl` variable

**Chosen: Populate `@baseUrl` with `servers[0].url`.** If `servers` is empty or missing, `@baseUrl` is set to empty string (requests will show `{{baseUrl}}/users` — user fills via env file).

Server template variables (`servers[0].variables`) are resolved using their `default` values if present, else left as `{{varName}}` in the URL.

### Decision 11: Warning output — stderr

**Chosen: Reuse the existing `warn()` pattern from `postman-parser.ts`.** Unsupported features (external `$ref`, OAuth2, webhooks, unsupported content types) are logged to `process.stderr` with yellow ANSI coloring, matching the `--insecure` warning pattern.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Large OpenAPI specs (1000+ operations) cause synchronous JSON.parse blocking | Not a blocker for MVP — same issue exists with large Postman collections. Can add worker-thread parsing in a future pass. |
| `oneOf`/`anyOf`/`allOf` schemas produce empty bodies | Acceptable for MVP — warn to stderr. Users fill bodies manually via `.http` editing or `S` save. |
| External `$ref` (multi-file specs) not supported | Warn and skip — treated as unresolved. Single-file specs are the common case for TUI usage. |
| Variable name collisions (same parameter name across operations) | `FileVariable[]` is a flat list — later declarations override earlier ones. This is acceptable because env files override file variables anyway, and the user typically fills values via env files. |
| Swagger 2.0 specs detected as `'openapi'` but produce empty results | Parser checks for `openapi` field specifically and warns if only `swagger` is present. Clear error message guides user. |
| Server template variables with no `default` leave `{{var}}` in `@baseUrl` | Acceptable — user fills via env file, same as any other variable. |
| Level 1 body synthesis omits properties without `.example` | Acceptable — produces a partial but usable body. User adds missing fields via `.http` editing. |
