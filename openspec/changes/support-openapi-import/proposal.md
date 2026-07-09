## Why

httptui currently parses `.http` files and Postman Collection v2.1 JSON. OpenAPI 3.x is the industry standard for API description, used by Spring Boot (springdoc-openapi), FastAPI, NestJS, and most modern backends. Supporting OpenAPI JSON import lets developers load their API spec directly and immediately browse/send requests — without manually writing `.http` files or exporting through Postman first.

## What Changes

- **New**: `src/core/openapi-parser.ts` — an OpenAPI 3.x JSON → `ParseResult` converter (no new dependencies, manual JSON parsing)
- **Modified**: `detectFormat()` in `src/core/postman-parser.ts` — return type extended to `'http' | 'postman' | 'openapi'`; detects OpenAPI by `openapi` top-level field
- **Modified**: 3 dispatch sites (`src/cli.tsx`, `src/app.tsx` ×2) — add `'openapi'` branch routing to the new parser
- **New**: Parameter-to-`{{varName}}` mapping — path/query/header/cookie parameters become `{{varName}}` placeholders backed by `FileVariable[]` entries
- **New**: Variable value resolution — uses `schema.default` if present, else `schema.example`, else empty `{{varName}}` placeholder
- **New**: Auth placeholder mapping — `bearerAuth`/`basicAuth`/`apiKey` security schemes emit `{{varName}}` headers (reuses existing Postman auth conversion pattern, no new auth types)
- **New**: Flat object body synthesis (Level 1) — when no content-level `example` exists, collects per-property `example` values from object schemas to build a JSON body
- **New**: Internal `$ref` resolution — resolves `#/components/schemas/...` and `#/components/parameters/...` references to extract defaults/examples
- **New**: Test fixtures and unit tests for OpenAPI parsing
- **No changes** to the reducer, executor, variable resolver, or any UI component — `ParseResult` is the existing target shape

## Capabilities

### New Capabilities
- `openapi-import`: Parse OpenAPI 3.x JSON files into httptui's internal `ParseResult` format, handling operation extraction, parameter-to-variable mapping, auth placeholder generation, body synthesis from examples, internal `$ref` resolution, and unsupported feature warnings.

### Modified Capabilities
<!-- No existing specs change. This is purely additive — a new parser module that outputs the same ParseResult shape the rest of the system already consumes. -->

## Impact

- **New file**: `src/core/openapi-parser.ts` (~350 lines)
- **Modified files**: `src/core/postman-parser.ts` (~10 lines, detectFormat extension), `src/cli.tsx` (~5 lines), `src/app.tsx` (~10 lines) — format detection + routing only
- **New test files**: `test/core/openapi-parser.test.ts` (~300 lines), JSON fixtures in `test/fixtures/openapi-*.json`
- **Zero new dependencies** — manual JSON parsing, no OpenAPI SDK or YAML library
- **Zero risk** to existing `.http` file parsing, Postman parsing, execution, variable resolution, or TUI — all changes are additive and behind a format detection gate
