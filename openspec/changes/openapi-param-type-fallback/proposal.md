## Why

OpenAPI parameters that declare only a `type` (no `default`, no `example`) currently produce empty placeholder values (`value: ""`). When parsed requests are saved to `.http` files or inspected in the TUI, these empty values give the user no hint about what the parameter expects. Using the declared `type` (e.g. `"string"`, `"integer"`) as a placeholder value signals "fill me in" and makes the type information visible at the point of use.

## What Changes

- Extend the parameter value resolution cascade in `resolveParamValue()` to add `schema.type` as a third fallback tier, used only when `schema.default` and `schema.example` are both absent.
- Constrain the type fallback to scalar string `type` values only. Nullable unions expressed as arrays (OpenAPI 3.1's `type: ["string", "null"]`) SHALL be skipped and fall through to empty string, so no ugly `"string,null"` placeholder is produced.
- No change to `format` handling — the `format` field (e.g. `uuid`, `date-time`) is deliberately out of scope.
- No change to server template variable resolution (`extractBaseUrl()`) or request body synthesis (`processRequestBody()`) — those code paths don't carry a `schema.type` and are naturally out of scope.

## Capabilities

### New Capabilities

<!-- None. This change modifies an existing capability's behavior. -->

### Modified Capabilities

- `openapi-import`: The parameter value resolution rule (currently `default → example → ""`) becomes `default → example → scalar type → ""`. Affects the path, query, header, and cookie parameter requirements that share this resolution rule.

## Impact

- **Code**: `src/core/openapi-parser.ts` — the `resolveParamValue()` function (lines 74-91) is the sole change site. ~3 lines added before the final `return ''`.
- **Tests**: `test/core/openapi-parser.test.ts` — the existing test `'maps path parameter with no default or example to empty string'` (line 207) asserts the current empty-string behavior for `{ type: 'integer' }` and will be split into two tests: one asserting the new type-fallback behavior, one asserting empty string when no schema/type is present at all.
- **Fixtures**: `test/fixtures/openapi-params.json` contains a header parameter `{ "name": "X-Trace-Id", "in": "header", "schema": { "type": "string" } }` whose emitted variable value changes from `""` to `"string"`; any test asserting this fixture's output needs updating.
- **No runtime behavior change** for execution — placeholders are still `{{varName}}` and are resolved by the existing variable system; only the default `FileVariable.value` differs.
- **No breaking API change** to `ParseResult` / `FileVariable` shapes.
