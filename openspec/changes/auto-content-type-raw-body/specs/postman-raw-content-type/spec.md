## ADDED Requirements

### Requirement: Auto-generate Content-Type for raw body based on language hint

The system SHALL inspect `body.options.raw.language` when `body.mode === 'raw'` and inject the corresponding `Content-Type` header into the parsed request if and only if the request does not already explicitly declare a `Content-Type` header. The mapping SHALL be: `json` → `application/json`, `xml` → `application/xml`, `text` → `text/plain`, `html` → `text/html`. Unrecognized languages SHALL be silently ignored.

#### Scenario: Raw body with JSON language hint generates Content-Type header
- **WHEN** a Postman request has body mode `raw`, raw content `{"name": "Alice"}`, and `options.raw.language` set to `json`
- **THEN** the parsed request SHALL include header `Content-Type: application/json`

#### Scenario: Raw body with XML language hint generates Content-Type header
- **WHEN** a Postman request has body mode `raw`, raw content `<name>Alice</name>`, and `options.raw.language` set to `xml`
- **THEN** the parsed request SHALL include header `Content-Type: application/xml`

#### Scenario: Raw body with text language hint generates Content-Type header
- **WHEN** a Postman request has body mode `raw`, raw content `plain text`, and `options.raw.language` set to `text`
- **THEN** the parsed request SHALL include header `Content-Type: text/plain`

#### Scenario: Raw body with HTML language hint generates Content-Type header
- **WHEN** a Postman request has body mode `raw`, raw content `<h1>Title</h1>`, and `options.raw.language` set to `html`
- **THEN** the parsed request SHALL include header `Content-Type: text/html`

#### Scenario: Explicit Content-Type header is not overridden
- **WHEN** a Postman request has body mode `raw`, `options.raw.language` set to `json`, AND an explicit header `Content-Type: application/custom+json`
- **THEN** the parsed request SHALL retain the explicit header `Content-Type: application/custom+json`

#### Scenario: Unrecognized raw language is silently ignored
- **WHEN** a Postman request has body mode `raw`, `options.raw.language` set to `graphql`, and no explicit `Content-Type` header
- **THEN** the parsed request SHALL NOT have a `Content-Type` header injected

#### Scenario: Raw body without language hint leaves headers unchanged
- **WHEN** a Postman request has body mode `raw` with content `some data` and no `options.raw.language` property
- **THEN** the parsed request SHALL NOT have a `Content-Type` header injected
