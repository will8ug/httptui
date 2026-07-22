## 1. Setup

- [x] 1.1 Add `yaml` as a runtime dependency (`npm install yaml`)

## 2. Parser refactor (parse-once)

- [x] 2.1 Change `parseOpenApiSpec(content: string)` to `parseOpenApiSpec(doc: unknown)` in src/core/openapi-parser.ts, removing the internal `JSON.parse` and validating the document shape instead
- [x] 2.2 Update existing openapi-parser unit tests to parse fixture/inline strings into objects before calling `parseOpenApiSpec`

## 3. Format detection: YAML branch + coercion

- [x] 3.1 Add a `.yaml`/`.yml` branch to `detectFormat` in src/core/format-detector.ts: YAML-parse content and return `'openapi'` when top-level `openapi`/`swagger` keys are present
- [x] 3.2 Replace `typeof === 'string'` checks with `String(value ?? '')` coercion for `openapi`/`swagger` in both JSON and YAML branches
- [x] 3.3 Update `parseAnyFormat` to parse content by extension (JSON via `JSON.parse`, YAML via `yaml`'s `parse`) and pass the document object to `parseOpenApiSpec`

## 4. Marker-sniff hard error

- [x] 4.1 Add marker detection on raw content (`/^(openapi|swagger)\s*:/m` for YAML, `/"(openapi|swagger)"\s*:/` for JSON) in the format-detection path
- [x] 4.2 Throw `Failed to parse OpenAPI spec: invalid YAML` (with parser error detail) when a `.yaml`/`.yml` file matches a marker but YAML parsing throws
- [x] 4.3 Backport: throw `Failed to parse OpenAPI spec: invalid JSON` when a `.json` file matches a marker but `JSON.parse` throws (replaces silent `.http` fallback)
- [x] 4.4 Verify the CLI surfaces the thrown error via `exitWithError` and the `o` overlay shows it via its existing catch path; adjust call sites if needed

## 5. Tests and fixtures

- [x] 5.1 Add format-detector tests: YAML OpenAPI detect, unquoted `swagger: 2.0` YAML detect, valid non-OpenAPI YAML → `'http'`, `.http`/`.rest` unchanged, Postman not misclassified
- [x] 5.2 Add hard-error tests: malformed YAML with marker, malformed JSON with marker, nested/commented marker lines ignored
- [x] 5.3 Add `test/fixtures/openapi-basic.yaml` (mirror of the basic JSON fixture) and a YAML parse test asserting the same `ParseResult` shape as the JSON equivalent
- [x] 5.4 Add a small `examples/openapi-basic.yaml` example file for manual verification

## 6. Docs

- [x] 6.1 Update README: mention OpenAPI (JSON and YAML) in "Multi-Format Support" and usage examples, concisely
- [x] 6.2 Update the Purpose paragraph of openspec/specs/openapi-import/spec.md to mention YAML alongside JSON (delta format covers requirements only)

## 7. Verification

- [x] 7.1 Run `npm test`, `npm run lint`, and `npm run build` — all clean
- [x] 7.2 Manually open `examples/openapi-basic.yaml` and the existing Spring Boot JSON example in the TUI; confirm identical request lists
- [x] 7.3 Run `openspec validate add-openapi-yaml-support --strict`
