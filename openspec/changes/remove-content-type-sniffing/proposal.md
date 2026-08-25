## Why

httptui currently guesses a request body's `Content-Type`: the executor sets `application/json` whenever a body starts with `{` or `[` and no `Content-Type` header is present, and copy-as-curl mirrors that guess. This sniffing is not aligned with curl (which never inspects the body) and can surprise users who intentionally send a JSON-looking payload under a different — or no — media type. Content-Type should come only from the user's explicit indication.

## What Changes

- **Executor**: no longer sets `Content-Type: application/json` for JSON-looking bodies. It sends the request's headers as-is; when no `Content-Type` header is present, none is sent, regardless of body content. This is a **BREAKING** change for `.http`/Postman/OpenAPI requests that carried a JSON body without an explicit `Content-Type` header.
- **Serializer** (copy-as-curl): no longer emits `-H 'Content-Type: application/json'` for JSON-looking bodies. It emits only the request's own headers.
- Remove the now-dead `shouldAddJsonContentType` helper.
- Parser (paste-as-curl) is unchanged: `--json` remains an explicit JSON indication (sets `Content-Type`/`Accept: application/json`), and `-d`/`--data*` continue to set the body only.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `executor`: the executor SHALL NOT synthesize a `Content-Type` header; it sends only the request's explicit headers.
- `copy-as-curl`: the serializer SHALL NOT synthesize a `Content-Type` header; it emits only the request's explicit headers.

## Impact

- `src/core/executor.ts` — remove the JSON `Content-Type` auto-detection.
- `src/core/curl-serializer.ts` — remove the JSON `Content-Type` emission.
- `src/core/headers.ts` — remove the dead `shouldAddJsonContentType` helper.
- Tests: `test/core/executor.test.ts`, `test/core/curl-serializer.test.ts`.
