## Context

httptui currently parses `.http`/`.rest` files via a custom state-machine parser (`src/core/parser.ts`, 246 lines) that outputs `ParseResult { requests: ParsedRequest[], variables: FileVariable[] }`. The entire execution pipeline — reducer, variable resolver, executor, all UI components — consumes this `ParseResult` shape.

Postman Collection v2.1 is the industry-standard JSON format for API request definitions. It has a richer, nested structure (folders, structured URLs, multiple body modes, auth inheritance) that needs to be projected onto httptui's flat `ParsedRequest[]` model.

The Postman Inc. `postman-collection` SDK (MIT, ~50KB, 0 transitive production deps) provides a `Collection` class that handles JSON parsing, URL reconstruction, folder flattening, header conversion, and variable resolution. Using it eliminates ~200 lines of manual parsing code.

## Goals / Non-Goals

**Goals:**
- Parse Postman Collection v2.1 JSON files into `ParseResult` using the `postman-collection` SDK
- Auto-detect format by content structure (not just `.json` extension)
- Convert Basic, Bearer, and API Key auth types to standard HTTP headers
- Convert `urlencoded` body mode to `key=val&...` string with appropriate Content-Type
- Flatten nested folders with name prefixing (e.g., "Users / Create User")
- Map collection variables to `FileVariable[]`
- Log warnings to stderr for unsupported features (scripts, file uploads, OAuth2, etc.)
- Assign synthetic incrementing `lineNumber` values for unique React keys

**Non-Goals:**
- Postman environment files (deferred to Phase 2)
- GraphQL body mode conversion (deferred to Phase 2)
- Form-data with file uploads (deferred to Phase 2+)
- Pre-request/test scripts (never — fundamentally different paradigm)
- OAuth2 interactive flows (never)
- Named environment switching UI (separate feature)
- Postman → .http export (inverse direction)
- Collection Runner equivalent

## Decisions

### Decision 1: Use `postman-collection` SDK vs. manual JSON parsing

**Chosen: SDK.** The official `postman-collection` package handles:
- URL reconstruction from structured parts (`protocol + host + path + query + variable`)
- Recursive folder flattening (ItemGroup → Item[] → `.items.members[]`)
- Header array `[{key, value}]` → `Record<string, string>`
- Variable inheritance across collection/folder/item scopes
- Auth resolution through inheritance chains

Manual parsing would require ~200-300 additional lines, introduce edge-case bugs (URL reconstruction, auth inheritance), and cost ~5 extra days of development.

**Alternative considered**: Manual JSON parsing with zero new dependencies. Rejected because the SDK is lightweight (0 transitive production deps), officially maintained by Postman Inc., and eliminates an entire class of bugs.

### Decision 2: Include auth conversion in MVP

**Chosen: Include.** With the SDK, auth conversion is trivial — reading `item.request.auth` properties and generating the appropriate `Authorization` header. Three auth types are supported:

| Auth Type | Conversion | SDK Property |
|-----------|-----------|--------------|
| `basic` | `Authorization: Basic base64(user:pass)` | `auth.parameters()` |
| `bearer` | `Authorization: Bearer <token>` | `auth.parameters()` |
| `apikey` (header mode) | Add specified header: `<key>: <value>` | `auth.parameters()` |

`oauth2`, `oauth1`, `digest`, `ntlm`, `hawk`, `awsv4` are logged as warnings and skipped.

**Alternative considered**: Skip auth in MVP, defer to Phase 2. Rejected because many real-world collections use auth, and without auth conversion they'd be unusable. With the SDK, the cost is negligible.

### Decision 3: Include urlencoded body conversion in MVP

**Chosen: Include.** When `body.mode === "urlencoded"`, convert the `[{key, value}]` array to a `key=val&key2=val2` string and inject a `Content-Type: application/x-www-form-urlencoded` header. `raw` mode passes through as-is. `formdata` with text-only fields is converted to urlencoded equivalent. `formdata` with file fields, `file`, and `graphql` modes are logged as warnings.

**Alternative considered**: Support raw body only in MVP. Rejected because urlencoded conversion is trivial with the SDK (~10 lines) and unlocks many API collections that use form-encoded bodies.

### Decision 4: Folder display — name prefixing

**Chosen: Prefix names with folder path.** Nested folders (ItemGroups) are flattened by the SDK into `.items.members[]`. To preserve folder context, request names are prefixed: `"Users / Create User"`, `"Users / Auth / Login"`.

The `name` field in `ParsedRequest` is display-only — it doesn't affect execution. No UI changes needed.

**Alternative considered**: Add folder grouping to the RequestList UI as expandable sections. Rejected for MVP — requires new UI components and state management. Can be revisited in Phase 2.

### Decision 5: lineNumber assignment — auto-increment

**Chosen: Auto-increment counter.** Postman collections have no line numbers. Assigning all `0` would cause duplicate React keys if two requests share the same method+URL. An incrementing counter (`1`, `2`, `3`...) guarantees unique keys:

```
key={`${request.lineNumber}-${request.method}-${request.url}`}
```

**Alternative considered**: All `0`. Rejected because it breaks React rendering on collections with duplicate method+URL pairs (edge case, but zero-cost to fix).

### Decision 6: Warning output — stderr

**Chosen: stderr.** Following the existing `--insecure` warning pattern in `cli.tsx:49`, unsupported feature warnings are written to `process.stderr` with yellow ANSI coloring.

**Alternative considered**: In-app warning panel overlay. Rejected — requires UI component changes, adds complexity. The warnings are informational during import, not interactive.

### Decision 7: Format detection — content-based heuristic

**Chosen: Try JSON parse, check schema field.** The detection function attempts `JSON.parse()` and checks `parsed?.info?.schema?.includes('postman')`. If JSON parse fails or schema doesn't match, falls through to `.http` parser. The `.json` extension is a fast path hint, not a requirement — users can name their files anything.

```typescript
function detectFormat(content: string, filePath: string): 'http' | 'postman' {
  if (filePath.endsWith('.json')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed?.info?.schema?.includes('postman') || (parsed?.info && parsed?.item)) {
        return 'postman';
      }
    } catch { /* fall through */ }
  }
  return 'http';
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| `postman-collection` SDK v5.x may introduce breaking changes | Pin to `^4.5.0` in package.json. The SDK has been stable for years and is maintained by Postman Inc. |
| Large collections (1000+ requests) can cause synchronous JSON.parse blocking | Not a blocker for MVP. `.http` files have the same issue with large files. Can add worker-thread parsing in a future performance pass. |
| Auth inheritance edge cases (collection-level auth overridden at folder level but not item level) | The SDK resolves auth inheritance correctly. Our code only reads the final resolved auth from `item.request.auth`. |
| `url.raw` may be empty in some collections (user only filled structured URL fields) | The SDK's `url.toString()` reconstructs from structured parts. Fall back to empty string if both are missing. |
| Unknown Postman features in future collection versions | The SDK handles forward compatibility. New features we don't explicitly convert will be silently ignored (or logged as warnings if detected). |
