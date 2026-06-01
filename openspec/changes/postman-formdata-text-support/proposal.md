## Why

Postman collections with `formdata` body mode are currently converted to `application/x-www-form-urlencoded` — a lossy transformation that breaks APIs expecting proper `multipart/form-data` encoding. Supporting text-only formdata fields (the 80% case — no file uploads) fixes this gap with minimal scope, unblocking a common Postman collection usage pattern.

## What Changes

- **Postman formdata text fields are now sent as proper `multipart/form-data`** instead of being converted to URL-encoded strings. The correct `Content-Type: multipart/form-data; boundary=...` header is generated automatically.
- **Formdata field values support `{{variable}}` resolution**, consistent with other body modes.
- **File upload fields (`type: "file"`) remain unsupported** — they continue to trigger a warning and are skipped, same as today.
- **`.http` file behavior is unchanged** — users who write manual multipart boundaries already get correct behavior via raw body pass-through.
- **Request detail panel displays formdata fields as `key=value` lines** for readability.
- **Existing spec `postman-collection-import` is updated** to reflect the new supported formdata behavior (text-only).

## Capabilities

### New Capabilities
- `formdata-body`: Representing and sending `multipart/form-data` request bodies with text-only fields, built from structured form parameter arrays during Postman collection parsing.

### Modified Capabilities
- `postman-collection-import`: Update the "Extract request body" requirement — text-only formdata is now supported with proper multipart encoding. Only formdata containing file fields remains unsupported.

## Impact

- `src/core/types.ts` — new `FormDataBody` type + extend `ParsedRequest.body` to accept structured formdata
- `src/core/postman-parser.ts` — store `FormDataParam[]` instead of urlencoding formdata; update Content-Type header logic
- `src/core/executor.ts` — build `FormData` object from structured params and pass to undici
- `src/core/variables.ts` (potential) — resolve `{{var}}` in formdata field values
- `src/components/RequestDetailsView.tsx` — render formdata fields as `key=value` lines
- `openspec/specs/postman-collection-import/spec.md` — delta spec for updated formdata behavior