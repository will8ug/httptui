# Spec: Formdata Body

## Purpose

Represent and send `multipart/form-data` request bodies with text-only fields, built from structured form parameter arrays during Postman collection parsing. This enables httptui to correctly handle Postman's `formdata` body mode, sending proper multipart encoding instead of the previous URL-encoded workaround.

## Requirements

### Requirement: Formdata body representation
The system SHALL support a structured representation of `multipart/form-data` request bodies via an optional `formdataFields` property on parsed requests. Each field SHALL have a `key` and `value` (both strings). The `type` property from the Postman collection format SHALL be used to distinguish text fields from file fields.

#### Scenario: Parsed request with formdata fields
- **WHEN** a parsed request has `formdataFields: [{ key: "username", value: "alice", type: "text" }, { key: "email", value: "alice@example.com", type: "text" }]`
- **THEN** the system SHALL recognize these as multipart form fields to be sent as `multipart/form-data`

#### Scenario: Parsed request without formdata fields
- **WHEN** a parsed request has `formdataFields` undefined
- **THEN** the system SHALL treat the request body as a raw string (existing behavior, unchanged)

### Requirement: Multipart form-data encoding
When sending a request with `formdataFields`, the system SHALL build a `FormData` object and pass it to the HTTP client. Before building the `FormData`, the executor SHALL remove any existing `Content-Type` header from the request headers so the HTTP client auto-generates the correct `Content-Type: multipart/form-data; boundary=...` header. All text fields SHALL be appended to the `FormData` object with their key and value.

#### Scenario: Single text field sent as multipart
- **WHEN** a request with `formdataFields: [{ key: "name", value: "Alice" }]` is executed
- **THEN** the HTTP request body SHALL be a valid `multipart/form-data` payload containing the field `name=Alice`

#### Scenario: Multiple text fields sent as multipart
- **WHEN** a request with `formdataFields: [{ key: "name", value: "Alice" }, { key: "age", value: "30" }]` is executed
- **THEN** the HTTP request body SHALL contain both fields `name=Alice` and `age=30` as separate multipart parts

#### Scenario: Content-Type header stripped before sending
- **WHEN** a request with `formdataFields` populated has a `Content-Type: multipart/form-data` header (injected by the parser for display)
- **THEN** the executor SHALL remove that header before sending, and the HTTP client SHALL auto-generate `Content-Type: multipart/form-data; boundary=...`

### Requirement: Formdata field variable resolution
The system SHALL resolve `{{variable}}` placeholders in formdata field values using the existing variable resolution mechanism, consistent with how variables are resolved in URLs, headers, and raw body strings.

#### Scenario: Variable in formdata field value is resolved
- **WHEN** a request has `formdataFields: [{ key: "token", value: "{{apiKey}}" }]` and a variable `apiKey = "abc123"` is defined
- **THEN** the resolved field value SHALL be `abc123`

#### Scenario: Variable resolution does not modify field key
- **WHEN** a request has `formdataFields: [{ key: "{{fieldName}}", value: "hello" }]` and a variable `fieldName = "greeting"` is defined
- **THEN** the resolved field key SHALL remain `{{fieldName}}` (keys are not resolved, only values)

### Requirement: Formdata fields display in request detail panel
The system SHALL display formdata fields as `key=value` lines in the request detail panel, after the method/URL line and headers section. Each field SHALL render on its own line. The `Content-Type: multipart/form-data` header (injected by the parser) SHALL appear in the headers section, giving users a clear preview of the encoding type.

#### Scenario: Formdata fields displayed in detail panel with Content-Type header
- **WHEN** viewing a request with `formdataFields: [{ key: "name", value: "Alice" }, { key: "email", value: "alice@example.com" }]` and headers `{ "Content-Type": "multipart/form-data" }` in the detail panel
- **THEN** the panel SHALL show `Content-Type: multipart/form-data` in the headers section, followed by `name=Alice` and `email=alice@example.com` as separate lines

#### Scenario: Request without formdata fields displays body normally
- **WHEN** viewing a request with `formdataFields` undefined and a raw body string
- **THEN** the detail panel SHALL display the raw body text as before (unchanged behavior)