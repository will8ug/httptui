## Context

httptui currently parses Postman collections and converts request bodies to a flat `body: string | undefined` representation. The executor sends this string directly to undici. For `formdata` body mode, the parser converts form fields to a URL-encoded string (`key=value&key2=value2`) and sets `Content-Type: application/x-www-form-urlencoded`. This is semantically incorrect for `multipart/form-data` and fails for APIs that strictly require multipart encoding.

The `postman-collection` SDK (v4.5.0) already provides structured `FormParam` objects with `key`, `value`, `type` (text/file), `src`, `contentType`, and `fileName` fields. undici v7 natively supports `FormData` objects as request bodies, handling boundary generation automatically.

## Goals / Non-Goals

**Goals:**
- Convert Postman collection `formdata` text fields to proper `multipart/form-data` encoding
- Generate correct `Content-Type: multipart/form-data; boundary=...` header automatically
- Resolve `{{variable}}` placeholders in formdata field values
- Display formdata fields as readable `key=value` lines in the request detail panel
- Keep file upload fields (`type: "file"`) unsupported with existing warning behavior

**Non-Goals:**
- File upload support (`type: "file"`) — remains unsupported, skipped with warning
- Per-field `Content-Type` headers — all text fields use default multipart encoding
- Structured formdata syntax for `.http` files — users continue to write manual boundaries
- UI for editing formdata fields — display only, no interactive editing

## Decisions

### Decision 1: Backward-compatible body type extension (Option B)

**Chosen**: Add optional `formdataFields?: FormDataParam[]` to `ParsedRequest` and `ResolvedRequest`, keeping `body: string | undefined` for raw/urlencoded modes.

**Alternative considered**: Discriminated union (`{ kind: 'raw', value: string } | { kind: 'formdata', fields: FormDataParam[] } | ...`) — cleaner long-term but requires changes across the entire body pipeline (parser, reducer, display, variable resolution). Too invasive for v1.

**Rationale**: The optional field approach is minimal, backward-compatible, and localizes changes to the formdata path. Future refactoring to a discriminated union remains possible.

### Decision 2: Multipart encoding at request time (in executor)

**Chosen**: Store structured `FormDataParam[]` in the parsed request, build `FormData` object in `executor.ts` at request time.

**Alternative considered**: Serialize to multipart string at parse time — simpler but loses the ability to resolve variables and makes the body opaque. The executor already handles Content-Type inference (e.g., auto-detecting JSON), so adding FormData logic there is consistent.

**Rationale**: Variable resolution happens between parse and execute. Building FormData at request time ensures resolved variable values are used. Also lets undici handle boundary generation.

### Decision 3: Use undici's native FormData

**Chosen**: Build a `FormData` object (available in Node.js 24, which this project requires) and pass it to `undici.request({ body: formData })`.

**Rationale**: No new dependencies. undici handles boundary generation and Content-Type header automatically. The `FormData` API is standard and well-tested.

### Decision 4: Content-Type handling

**Chosen**: When formdata fields are present, the executor builds a `FormData` object and passes it to undici. undici auto-generates the `Content-Type: multipart/form-data; boundary=...` header. The `postman-parser.ts` no longer injects `Content-Type: application/x-www-form-urlencoded` for formdata mode.

**Rationale**: undici handles the boundary and Content-Type correctly. Manual Content-Type injection is error-prone (boundary must match body content exactly).

## Risks / Trade-offs

- **[Risk] Breaking change for APIs that accept URL-encoded fallback** → Currently, formdata is sent as URL-encoded, which some APIs accept. Switching to multipart/form-data may break these APIs. **Mitigation**: This is the correct behavior — formdata should be multipart. APIs that accept either format will continue to work. Those that strictly require URL-encoded should use the `urlencoded` body mode instead.

- **[Risk] Large formdata arrays in memory** → Storing structured `FormDataParam[]` uses more memory than a flat string. **Mitigation**: Formdata arrays in real-world Postman collections are typically small (<50 fields). No practical concern.

- **[Trade-off] No per-field Content-Type** → All text fields use default multipart encoding. Some APIs may require specific Content-Type per field. **Mitigation**: This is an edge case; file uploads (which are the primary use case for per-field Content-Type) are explicitly out of scope. Can be added later.