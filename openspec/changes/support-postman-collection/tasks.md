## 1. Setup

- [ ] 1.1 Add `postman-collection` dependency to `package.json` (`npm install postman-collection@^4.5.0`)
- [ ] 1.2 Create Postman collection test fixtures: `test/fixtures/postman-basic.json` (single GET, raw body), `test/fixtures/postman-nested.json` (folders + auth), `test/fixtures/postman-variables.json` (collection variables + urlencoded), `test/fixtures/postman-empty.json` (no items)

## 2. Core Parser

- [ ] 2.1 Create `src/core/postman-parser.ts` with `parsePostmanCollection(content: string): ParseResult` — converts Postman Collection v2.1 JSON to httptui's internal format using the `postman-collection` SDK
- [ ] 2.2 Implement body mode conversion: `raw` → pass-through, `urlencoded` → `key=val&...` string with Content-Type header injection, unsupported modes → warning + `undefined`
- [ ] 2.3 Implement auth → header conversion: Basic → `Authorization: Basic base64(user:pass)`, Bearer → `Authorization: Bearer <token>`, API Key (header mode) → add specified header, unsupported types → warning
- [ ] 2.4 Implement folder flattening with name prefixing: nested items get `"FolderName / ItemName"` naming, deeply nested get full path: `"Parent / Child / ItemName"`
- [ ] 2.5 Implement collection variable extraction: `collection.variables` → `FileVariable[]` with `{key: name, value: string}`
- [ ] 2.6 Implement synthetic `lineNumber` assignment: auto-increment counter starting from 1 for unique React keys
- [ ] 2.7 Implement request name fallback: use `item.name`, fall back to `"Request N"` where N is the 1-based index
- [ ] 2.8 Implement unsupported feature warnings to stderr with yellow ANSI coloring (scripts, file uploads, OAuth2, unsupported auth types, etc.)

## 3. Format Detection

- [ ] 3.1 Implement `detectFormat(content: string, filePath: string): 'http' | 'postman'` — try JSON parse, check for `info.schema` containing "postman" or `info` + `item` presence; fall through to 'http' on parse failure
- [ ] 3.2 Add format detection and routing in `src/cli.tsx` (line ~25): use `detectFormat()` to choose between `parseHttpFile()` and `parsePostmanCollection()`
- [ ] 3.3 Add format detection and routing in `src/app.tsx` file-load handler (line ~149): same routing when opening a different file via `o` key
- [ ] 3.4 Add format detection and routing in `src/app.tsx` reload handler (line ~289): same routing when reloading via `R` key

## 4. Tests

- [ ] 4.1 Write `test/postman-parser.test.ts` with unit tests: parse basic collection, nested folders with name prefixing, auth conversion (basic, bearer, apikey), body modes (raw, urlencoded), variables extraction, empty collection, unnamed items, synthetic lineNumbers, warning output
- [ ] 4.2 Write integration smoke test: end-to-end parsing of a realistic Postman collection and verify all requests render in TUI
- [ ] 4.3 Run full test suite (`vitest run`) to verify zero regressions in existing `.http` parser, executor, or variable resolver tests

## 5. Verification

- [ ] 5.1 Run `npm run build` — verify clean TypeScript compilation
- [ ] 5.2 Run `npm run lint` — verify no ESLint errors
- [ ] 5.3 Manual smoke test: `httptui examples/postman-sample.json` — verify requests appear, can be selected and sent, responses display correctly
- [ ] 5.4 Manual test: open Postman collection via `o` key from within TUI — verify file-load overlay accepts `.json` files
- [ ] 5.5 Manual test: reload Postman collection via `R` key — verify reload works without errors
