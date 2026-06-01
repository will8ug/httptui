## Why

Postman automatically generates `Content-Type` headers when a request uses `raw` body mode with an explicit language hint (e.g., `"language": "json"`), even if no `Content-Type` header is declared in the collection. Currently, httptui's Postman parser only injects `Content-Type` for `urlencoded` and `formdata` body modes, leaving `raw` + JSON requests without the expected header. This causes the request details panel to display an incomplete header list, diverging from Postman's actual behavior.

## What Changes

- Modify `postman-parser.ts` to detect `body.options.raw.language` when `body.mode === 'raw'`
- Inject the corresponding `Content-Type` header based on the language hint (e.g., `json` → `application/json`, `xml` → `application/xml`)
- Only inject the header if the request does not already explicitly declare a `Content-Type`
- Add/extend test coverage for raw body language detection and header injection

## Capabilities

### New Capabilities
- `postman-raw-content-type`: Auto-generate Content-Type headers for Postman raw body requests based on the language hint

### Modified Capabilities
- `postman-collection-import`: Extend body extraction to support language-aware Content-Type header injection for raw body mode

## Impact

- `src/core/postman-parser.ts` — adds language detection and header injection logic
- `test/postman-parser.test.ts` (or similar) — new test cases for raw body language scenarios
- No breaking changes; existing behavior for urlencoded/formdata remains unchanged
