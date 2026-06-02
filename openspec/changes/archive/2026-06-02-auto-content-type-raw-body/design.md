## Context

Postman collections often use `raw` body mode with a language hint (e.g., `"language": "json"`) instead of explicitly declaring a `Content-Type` header. Postman itself automatically generates the appropriate `Content-Type` header at request time. httptui's current Postman parser (`src/core/postman-parser.ts`) only injects `Content-Type` for `urlencoded` and `formdata` body modes, causing `raw` + JSON requests to appear headerless in the request details panel.

The fix is localized to the parser: after body conversion, check if the body mode is `raw` and a language hint exists in `body.options.raw.language`, then map that hint to a standard MIME type and inject it as a header if no explicit `Content-Type` is already present.

## Goals / Non-Goals

**Goals:**
- Ensure `raw` body requests with a language hint display the correct auto-generated `Content-Type` header in httptui
- Maintain parity with Postman's actual request behavior
- Only inject the header when the user has not explicitly declared one

**Non-Goals:**
- Changing how `urlencoded` or `formdata` bodies are handled
- Modifying the request execution logic (executor) or the TUI display components
- Supporting every possible MIME type; only common Postman raw languages

## Decisions

1. **Mapping language to Content-Type**
   - Use a small, explicit mapping table inside `postman-parser.ts`
   - `json` → `application/json`
   - `xml` → `application/xml`
   - `text` → `text/plain`
   - `html` → `text/html`
   - Any unrecognized language is silently ignored (no header injected)

2. **Header precedence**
   - If the request already explicitly declares `Content-Type` (case-insensitive), do NOT override it
   - This matches Postman behavior where user-defined headers take precedence

3. **Where to implement**
   - Keep the logic inside `parsePostmanCollection` after `convertBody()` returns, alongside the existing `urlencoded` and `formdata` header injection logic
   - This keeps all body-mode-derived header logic in one place

## Risks / Trade-offs

- **[Risk] Postman may support more languages in the future** → Mitigation: the mapping is a simple object; adding new entries is trivial
- **[Risk] Case-sensitivity of header names** → Mitigation: check both `Content-Type` and `content-type` before injection
- **[Trade-off] Not all raw languages are covered** → Only the four most common Postman raw languages are mapped; others are ignored, which is safe and matches current behavior

## Open Questions

- Should we warn when an raw language is unrecognized? (Current decision: no, to stay consistent with the silent-fail approach used elsewhere in the parser)
