## Why

httptui currently only reads `.http`/`.rest` files. Many developers and teams store their API request definitions as Postman Collection v2.1 JSON — the industry-standard format exported by Postman, Insomnia, Hoppscotch, and other tools. Supporting Postman collection files as a first-class input format dramatically expands httptui's user base and opens the door to interoperability with the broader API tooling ecosystem.

## What Changes

- **New**: `src/core/postman-parser.ts` — a Postman Collection v2.1 JSON → `ParseResult` converter using the official `postman-collection` SDK
- **New**: `postman-collection` dependency (MIT-licensed, zero transitive production deps, maintained by Postman Inc.)
- **New**: Format auto-detection — the CLI and file-load handlers detect Postman JSON by content structure (not just extension)
- **New**: Auth → header conversion — Basic (`Authorization: Basic ...`), Bearer (`Authorization: Bearer ...`), and API Key (specified header) auth types are converted to standard HTTP headers during import
- **New**: urlencoded body conversion — `body.mode === "urlencoded"` is converted to `key=val&...` string with `Content-Type: application/x-www-form-urlencoded` header
- **New**: Unsupported feature warnings — the parser logs warnings to stderr for skipped features (scripts, file uploads, OAuth2, etc.) so users know what was not imported
- **New**: Test fixtures and unit tests for Postman collection parsing
- **No changes** to the reducer, executor, variable resolver, or any UI component — `ParseResult` is already the perfect target shape

## Capabilities

### New Capabilities
- `postman-collection-import`: Parse Postman Collection v2.1 JSON files into httptui's internal `ParseResult` format, handling request extraction, variable mapping, auth conversion, body mode conversion, folder flattening, and unsupported feature warnings.

### Modified Capabilities
<!-- No existing specs change. This is purely additive — a new parser module that outputs the same ParseResult shape the rest of the system already consumes. -->

## Impact

- **New dependency**: `postman-collection` (~50KB, MIT, 0 transitive production deps)
- **New file**: `src/core/postman-parser.ts` (~120 lines)
- **Modified files**: `src/cli.tsx` (~15 lines), `src/app.tsx` (~25 lines) — format detection + routing only
- **New test files**: `test/postman-parser.test.ts` (~250 lines), 4 JSON fixtures in `test/fixtures/`
- **Zero risk** to existing `.http` file parsing, execution, variable resolution, or TUI — all changes are additive and behind a format detection gate
