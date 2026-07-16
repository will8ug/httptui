## MODIFIED Requirements

### Requirement: Map path parameters to URL placeholders
The system SHALL replace path template segments (`{paramName}`) in the URL with `{{paramName}}` placeholders. For each path parameter, the system SHALL emit a `FileVariable` entry whose value follows the variable value resolution rule: `schema.default` if present, else `schema.example`, else the scalar `schema.type` (when `schema.type` is a string), else empty string. When `schema.type` is an array (e.g. OpenAPI 3.1 nullable unions like `["string", "null"]`), the system SHALL skip the type fallback and fall through to empty string.

#### Scenario: Path parameter with default
- **WHEN** an operation has path `/users/{id}` with a path parameter `id` having `schema: { type: integer, default: 1 }`
- **THEN** the URL SHALL be `{{baseUrl}}/users/{{id}}` and a `FileVariable` with name `id` and value `1` SHALL be present

#### Scenario: Path parameter with example and no default
- **WHEN** an operation has path `/users/{id}` with a path parameter `id` having `schema: { type: integer, example: 42 }`
- **THEN** the URL SHALL be `{{baseUrl}}/users/{{id}}` and a `FileVariable` with name `id` and value `42` SHALL be present

#### Scenario: Path parameter with type but no default or example
- **WHEN** an operation has path `/users/{id}` with a path parameter `id` having `schema: { type: integer }`
- **THEN** the URL SHALL be `{{baseUrl}}/users/{{id}}` and a `FileVariable` with name `id` and value `"integer"` SHALL be present

#### Scenario: Path parameter with no schema or no type information
- **WHEN** an operation has path `/users/{id}` with a path parameter `id` having no `schema` field, or `schema: {}`
- **THEN** the URL SHALL be `{{baseUrl}}/users/{{id}}` and a `FileVariable` with name `id` and value `""` SHALL be present

#### Scenario: Path parameter with nullable union type is skipped
- **WHEN** an operation has path `/users/{id}` with a path parameter `id` having `schema: { type: ["string", "null"] }`
- **THEN** the URL SHALL be `{{baseUrl}}/users/{{id}}` and a `FileVariable` with name `id` and value `""` SHALL be present

### Requirement: Map query parameters to URL query string
The system SHALL append query parameters to the URL as `?param={{param}}` (for the first parameter) or `&param={{param}}` (for subsequent parameters). Required and optional parameters SHALL both be included. For each query parameter, the system SHALL emit a `FileVariable` entry following the variable value resolution rule.

#### Scenario: Query parameter with default
- **WHEN** an operation has a query parameter `limit` with `schema: { type: integer, default: 20 }`
- **THEN** the URL SHALL include `?limit={{limit}}` and a `FileVariable` with name `limit` and value `20` SHALL be present

#### Scenario: Multiple query parameters
- **WHEN** an operation has query parameters `limit` (default 20) and `verbose` with `schema: { type: boolean }` (no default)
- **THEN** the URL SHALL include `?limit={{limit}}&verbose={{verbose}}` and `FileVariable` entries for both SHALL be present with values `20` and `"boolean"` respectively

#### Scenario: Query parameter with example and no default
- **WHEN** an operation has a query parameter `status` with `schema: { type: string, example: "active" }`
- **THEN** the URL SHALL include `?status={{status}}` and a `FileVariable` with name `status` and value `active` SHALL be present

### Requirement: Map header parameters to headers
The system SHALL add header parameters to the request's `headers` record with the parameter name as the key and `{{paramName}}` as the value. For each header parameter, the system SHALL emit a `FileVariable` entry following the variable value resolution rule.

#### Scenario: Header parameter with type but no default or example
- **WHEN** an operation has a header parameter `X-Trace-Id` with `schema: { type: string }`
- **THEN** the parsed request SHALL have header `X-Trace-Id: {{X-Trace-Id}}` and a `FileVariable` with name `X-Trace-Id` and value `"string"` SHALL be present

#### Scenario: Header parameter with default
- **WHEN** an operation has a header parameter `Accept` with `schema: { type: string, default: "application/json" }`
- **THEN** the parsed request SHALL have header `Accept: {{Accept}}` and a `FileVariable` with name `Accept` and value `application/json` SHALL be present

### Requirement: Map cookie parameters to Cookie header
The system SHALL combine cookie parameters into a single `Cookie` header with the format `name1={{name1}}; name2={{name2}}`. For each cookie parameter, the system SHALL emit a `FileVariable` entry following the variable value resolution rule.

#### Scenario: Single cookie parameter with type
- **WHEN** an operation has a cookie parameter `session` with `schema: { type: string }`
- **THEN** the parsed request SHALL have header `Cookie: session={{session}}` and a `FileVariable` with name `session` and value `"string"` SHALL be present

#### Scenario: Multiple cookie parameters
- **WHEN** an operation has cookie parameters `session` and `theme` both with `schema: { type: string }` and no defaults
- **THEN** the parsed request SHALL have header `Cookie: session={{session}}; theme={{theme}}` and `FileVariable` entries for both SHALL be present with values `"string"` for each
