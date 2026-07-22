## Why

OpenAPI specs in the wild are predominantly YAML, but httptui only reads OpenAPI JSON. Opening a `.yaml` spec today silently routes it to the `.http` parser, yielding an empty request list with no explanation. Separately, a `.json` file containing an OpenAPI marker but malformed JSON fails the same silent way — the user sees an empty TUI and has no idea why.

## What Changes

- Accept `.yaml` / `.yml` files as OpenAPI input, extension-gated and marker-sniffed, parsed with the `yaml` package (new dependency).
- Hard-error with a clear message when a file shows OpenAPI intent (top-level `openapi:` / `swagger:` key) but its YAML is unparseable — instead of silently falling through to the `.http` parser.
- **BREAKING (behavior)**: Apply the same marker-sniff hard-error to the JSON path — a `.json` file with an OpenAPI marker but malformed JSON now errors instead of silently showing an empty `.http` request list.
- Coerce `openapi` / `swagger` version keys with `String(...)` during detection so unquoted YAML scalars (e.g. `swagger: 2.0` parsing as a float) are still detected.
- Refactor: `detectFormat` parses content once and hands the document object to the OpenAPI parser, eliminating the current double `JSON.parse`.
- Update README to document OpenAPI (JSON + YAML) support.

## Capabilities

### New Capabilities

### Modified Capabilities
- `openapi-import`: extend format detection and parsing to cover YAML input; add hard-error behavior for unparseable content with OpenAPI markers (both YAML and JSON paths); version-key coercion in detection.

## Impact

- **Dependencies**: adds `yaml` (runtime dependency).
- **Code**: `src/core/format-detector.ts` (YAML branch, marker-sniff, parse-once refactor), `src/core/openapi-parser.ts` (accept a pre-parsed document), `src/cli.tsx` / `src/app.tsx` (error surfacing, unchanged call sites).
- **Specs**: `openspec/specs/openapi-import/spec.md` gains YAML requirements; the malformed-JSON scenario is modified from silent fallback to hard error.
- **Docs**: README "Multi-Format Support" and usage notes.
- **Out of scope**: YAML for env files, `.httptui.json`, or global config — those stay JSON.
