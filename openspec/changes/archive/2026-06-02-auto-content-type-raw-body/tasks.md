## 1. Parser Implementation

- [x] 1.1 Add raw-body language-to-Content-Type mapping in `postman-parser.ts`
- [x] 1.2 Inject auto-generated `Content-Type` header when `body.mode === 'raw'` and language hint is present, respecting existing explicit headers

## 2. Test Coverage

- [x] 2.1 Add test: raw body with JSON language hint generates `Content-Type: application/json`
- [x] 2.2 Add test: raw body with XML language hint generates `Content-Type: application/xml`
- [x] 2.3 Add test: raw body with text language hint generates `Content-Type: text/plain`
- [x] 2.4 Add test: raw body with HTML language hint generates `Content-Type: text/html`
- [x] 2.5 Add test: explicit `Content-Type` header is not overridden
- [x] 2.6 Add test: unrecognized raw language is silently ignored
- [x] 2.7 Add test: raw body without language hint leaves headers unchanged

## 3. Verification

- [x] 3.1 Run existing tests to ensure no regressions
- [x] 3.2 Run lint and format checks
