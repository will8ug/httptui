## Context

`detectFormat` (src/core/format-detector.ts) gates on a `.json` extension and `JSON.parse`; any other extension — including `.yaml`/`.yml` — returns `'http'` without inspection. `parseOpenApiSpec` (src/core/openapi-parser.ts) then `JSON.parse`s the same string a second time. Two consequences:

1. An OpenAPI YAML file is silently fed to the `.http` parser → empty request list.
2. A `.json` file with an `openapi`/`swagger` marker but malformed JSON throws inside `detectFormat`'s try/catch → also silently falls to the `.http` parser. The `"invalid JSON"` throw in `parseOpenApiSpec` is unreachable via `parseAnyFormat`.

Everything downstream of "have a JS object" in the OpenAPI parser ($ref resolution, Swagger 2.0 handling, body synthesis, auth) is already format-agnostic.

Error surfacing already exists and is reused as-is: `cli.tsx` reports fatal errors via `exitWithError`, and the `o` open-file overlay in `app.tsx` catches parse errors and shows them via `SET_FILE_LOAD_ERROR`.

## Goals / Non-Goals

**Goals:**
- Open `.yaml` / `.yml` OpenAPI files (3.x and Swagger 2.0-with-warning) in the CLI and the `o` overlay.
- Hard error with a clear message when a file shows OpenAPI intent (top-level marker key) but its content is unparseable — for YAML **and** JSON (backport).
- Parse content exactly once per format; the OpenAPI parser consumes the pre-parsed document.
- Detection tolerant of unquoted YAML scalars (`swagger: 2.0` → float) via `String(...)` coercion.
- README documents OpenAPI (JSON + YAML) support.

**Non-Goals:**
- YAML for env files, `.httptui.json`, or global config — those stay JSON.
- Extension-less content sniffing (consistent with today's `.json` gating).
- Fetching external `$ref`s; multi-document YAML support.
- Changes to the Postman or `.http` parse paths.

## Decisions

### 1. Add the `yaml` package as the YAML parser
`yaml` (spec-1.2 compliant, actively maintained, clean ESM) over `js-yaml` (YAML 1.1 quirks like `on:`/`off:` → boolean) and over hand-rolling (OpenAPI uses the full YAML surface). Default options are kept, including `maxAliasCount: 100`, which caps alias-amplification abuse in large third-party specs.

### 2. Extension-gated YAML detection, mirroring the JSON gate
`detectFormat` gains a `.yaml`/`.yml` branch that YAML-parses content and checks top-level `openapi`/`swagger` keys (coerced with `String(...)`). A valid-YAML file without markers falls through to `'http'` — the same permissive philosophy as a non-OpenAPI `.json` today. Alternative considered: sniffing every extension — rejected; it would YAML-parse every `.http` file on load and break symmetry with the JSON gate.

### 3. Marker-sniff hard error for unparseable content
Detection runs a cheap anchored regex on the **raw text** before/alongside parsing:
- YAML path: `/^(openapi|swagger)\s*:/m` (top-level keys only; indented or commented lines don't match).
- JSON path (backport): `/"(openapi|swagger)"\s*:/`.

If the marker matches but parsing throws, `parseAnyFormat` throws `Failed to parse OpenAPI spec: invalid YAML` (or `invalid JSON`). The CLI converts this to `exitWithError`; the `o` overlay already displays caught errors. Alternative considered: silent fall-through (today's behavior) — rejected; an empty TUI with no explanation is the worst possible failure mode for a file the user knows is OpenAPI.

### 4. Parse-once refactor: the parser receives the document object
`parseOpenApiSpec(content: string)` becomes `parseOpenApiSpec(doc: unknown)`; `parseAnyFormat` parses by extension (JSON via `JSON.parse`, YAML via `yaml`'s `parse`) and passes the object. Eliminates the double parse and makes the parser format-agnostic. The existing string-based unit tests are updated mechanically to parse the fixture string first. Alternative considered: keep the string signature and try-JSON-then-YAML inside the parser — rejected; it double-parses on the happy path and muddles error attribution.

### 5. Version-key coercion in detection
`typeof parsed.openapi === 'string'` becomes `String(parsed.openapi ?? '')` (same for `swagger`). In YAML, unquoted `swagger: 2.0` parses as a float; unquoted `openapi: 3.0.3` is already a string. This fixes detection for Swagger 2.0 YAML and marginally tolerates non-string JSON values. The parser's Swagger 2.0 warning path is unchanged.

### 6. Error text distinguishes format
`invalid YAML` vs `invalid JSON` in the thrown message, including the underlying parser error detail (e.g. line/column from `yaml`), so users get actionable output.

## Risks / Trade-offs

- **Regex marker false positives on JSON** (a malformed JSON file containing a nested `"openapi":` key that isn't really a spec) → hard error instead of silent `.http` fallback. Extremely unlikely; only fires when the JSON is *also* malformed.
- **Multi-document YAML** (`---` separators) → `yaml`'s `parse` throws; with markers present this yields the hard error, without markers it falls to the `.http` parser. Acceptable — OpenAPI specs are single-document.
- **Signature refactor ripples through the OpenAPI parser's unit tests** → mechanical update; the spec scenarios are the source of truth and remain format-neutral.
- **New runtime dependency** (`yaml`) → small, zero-dependency, widely used; bundled by tsup into dist as with existing deps.
- **Behavior change for broken JSON marker files** (silent empty list → hard error) → called out as **BREAKING (behavior)** in the proposal; the failure mode changes from confusing to explicit.

## Migration Plan

No data or config migration. Users who previously opened malformed JSON OpenAPI files and saw an empty list will now see an error message instead.
