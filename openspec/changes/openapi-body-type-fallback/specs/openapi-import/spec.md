## MODIFIED Requirements

### Requirement: Synthesize request body from examples
The system SHALL extract the request body based on a multi-tier example lookup. The system SHALL prefer `application/json` content type if present, otherwise use the first content type key. The body lookup order is: (1) `content[mediaType].example` (use verbatim), (2) `content[mediaType].examples[firstKey].value` (use verbatim), (3) resolve schema `$ref` and use `schema.example` (use verbatim), (4) if schema is `type: object` with `properties`, synthesize a flat JSON object by iterating each property, resolving the property schema `$ref` if present, then collecting `{ [name]: value }` for each property where value follows the per-property resolution rule: `prop.example` if present, else `prop.default` if present, else the scalar `prop.type` (when `prop.type` is a string), else the property is omitted, (5) otherwise `body: undefined`. For `application/x-www-form-urlencoded` content type, the synthesized body SHALL be serialized as `key=value&...` instead of JSON. When `prop.type` is an array (e.g. OpenAPI 3.1 nullable unions like `["string", "null"]`), the system SHALL skip the type fallback and omit the property if no `example` or `default` is present.

#### Scenario: Use content-level example
- **WHEN** an operation has `requestBody.content.application/json.example: { "name": "Alice" }`
- **THEN** the parsed request SHALL have body `{"name":"Alice"}` and header `Content-Type: application/json`

#### Scenario: Use named examples
- **WHEN** an operation has `requestBody.content.application/json.examples.alice.value: { "name": "Alice" }`
- **THEN** the parsed request SHALL have body `{"name":"Alice"}` (first example value)

#### Scenario: Use schema-level example via $ref
- **WHEN** an operation has `requestBody.content.application/json.schema.$ref: "#/components/schemas/User"` and `components.schemas.User.example: { "name": "Alice" }`
- **THEN** the parsed request SHALL have body `{"name":"Alice"}`

#### Scenario: Synthesize flat object from per-property examples
- **WHEN** an operation has `requestBody.content.application/json.schema.$ref: "#/components/schemas/DemoItem"` and `DemoItem` has properties `id` (example: 1), `name` (example: "Widget"), `description` (example: "A widget"), and `secret` (no example, `type: "string"`)
- **THEN** the parsed request SHALL have body `{"id":1,"name":"Widget","description":"A widget","secret":"string"}`

#### Scenario: Properties with type but no example or default use type as placeholder
- **WHEN** a schema has a property `templateId` with `{ "type": "string" }` (no `example`, no `default`)
- **THEN** the synthesized body SHALL include `"templateId":"string"`

#### Scenario: Properties with default but no example use default as value
- **WHEN** a schema has a property `count` with `{ "type": "integer", "default": 0 }` (no `example`)
- **THEN** the synthesized body SHALL include `"count":0`

#### Scenario: Property $ref is resolved before value lookup
- **WHEN** a schema has a property `user` with `{ "$ref": "#/components/schemas/UserRef" }` and `UserRef` is `{ "type": "string", "example": "alice" }`
- **THEN** the synthesized body SHALL include `"user":"alice"`

#### Scenario: Property $ref with type only uses type as placeholder
- **WHEN** a schema has a property `templateId` with `{ "$ref": "#/components/schemas/TemplateId" }` and `TemplateId` is `{ "type": "string" }` (no `example`, no `default`)
- **THEN** the synthesized body SHALL include `"templateId":"string"`

#### Scenario: Property with nullable union type is skipped
- **WHEN** a schema has a property `optional` with `{ "type": ["string", "null"] }` (no `example`, no `default`)
- **THEN** the synthesized body SHALL omit the `optional` property

#### Scenario: No body when no examples or types exist on non-object schema
- **WHEN** an operation has `requestBody.content.application/json.schema: { type: "string" }` with no example
- **THEN** the parsed request SHALL have `body: undefined`

#### Scenario: Prefer application/json over other content types
- **WHEN** an operation has `requestBody.content` with both `application/xml` and `application/json` keys
- **THEN** the parser SHALL use `application/json` and set `Content-Type: application/json`

#### Scenario: Urlencoded body synthesized as key=value
- **WHEN** an operation has `requestBody.content.application/x-www-form-urlencoded.schema.$ref: "#/components/schemas/FormSubmission"` and `FormSubmission` has properties `name` (example: "John") and `email` (example: "john@example.com")
- **THEN** the parsed request SHALL have body `name=John&email=john%40example.com` and header `Content-Type: application/x-www-form-urlencoded`

#### Scenario: No requestBody
- **WHEN** an operation has no `requestBody` field
- **THEN** the parsed request SHALL have `body: undefined` and no `Content-Type` header
