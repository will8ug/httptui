# Spec: OpenAPI Import

## Purpose

Parse OpenAPI 3.x JSON files into httptui's internal `ParseResult` format using manual JSON parsing (no external SDK). This enables httptui to serve as a terminal-based client for OpenAPI specs, projecting operations onto flat `ParsedRequest[]` entries with `{{varName}}` placeholders for parameters and auth values. The parser handles the most common real-world OpenAPI 3.x patterns (path/query/header parameters, basic auth schemes, flat object bodies with per-property examples, internal `$ref` resolution) while logging warnings for unsupported features.
## Requirements
### Requirement: Parse OpenAPI 3.x JSON
The system SHALL parse OpenAPI 3.x JSON files into the internal `ParseResult` format using manual JSON parsing. The parser SHALL iterate over `paths` and, for each path+method pair, create one `ParsedRequest` entry. The parser SHALL return an empty requests array for specs with no paths.

#### Scenario: Parse a basic spec with a single GET operation
- **WHEN** an OpenAPI 3.x JSON contains one path `/users` with a `get` operation
- **THEN** the parser SHALL return a `ParseResult` with one `ParsedRequest` having method `GET` and url `{{baseUrl}}/users`

#### Scenario: Parse a spec with multiple operations on the same path
- **WHEN** an OpenAPI 3.x JSON has path `/users/{id}` with `get`, `put`, and `delete` operations
- **THEN** the parser SHALL return three `ParsedRequest` objects, one per method, in the order they appear in the path object

#### Scenario: Parse an empty spec
- **WHEN** an OpenAPI 3.x JSON has no `paths` field or an empty `paths` object
- **THEN** the parser SHALL return a `ParseResult` with an empty requests array and a `@baseUrl` variable if servers are present

#### Scenario: Reject invalid JSON
- **WHEN** the file content is not valid JSON
- **THEN** the parser SHALL throw an error with message "Failed to parse OpenAPI spec: invalid JSON"

#### Scenario: Warn on Swagger 2.0 spec
- **WHEN** a JSON file has a `swagger` field (version 2.0) but no `openapi` field
- **THEN** the parser SHALL log a warning to stderr that Swagger 2.0 is not supported and return a `ParseResult` with an empty requests array

### Requirement: Map server URL to baseUrl variable
The system SHALL extract the first entry from `servers[0].url` and emit it as a `FileVariable` named `baseUrl`. If `servers` is empty or missing, the variable SHALL have an empty string value. Server URL template variables (e.g., `{host}`) SHALL be resolved using `servers[0].variables[varName].default` when present, otherwise left as `{{varName}}` in the URL with a corresponding `FileVariable` entry.

#### Scenario: Single server URL
- **WHEN** an OpenAPI spec has `servers: [{ url: "https://api.example.com/v1" }]`
- **THEN** the parser SHALL return a `FileVariable` with name `baseUrl` and value `https://api.example.com/v1`

#### Scenario: Multiple servers
- **WHEN** an OpenAPI spec has `servers: [{ url: "https://api.example.com" }, { url: "https://api.staging.com" }]`
- **THEN** the parser SHALL use the first server URL (`https://api.example.com`) as the `baseUrl` variable value

#### Scenario: No servers
- **WHEN** an OpenAPI spec has no `servers` field
- **THEN** the parser SHALL return a `FileVariable` with name `baseUrl` and value `""` (empty string)

#### Scenario: Server URL with template variable having default
- **WHEN** an OpenAPI spec has `servers: [{ url: "https://{host}/v1", variables: { host: { default: "api.example.com" } } }]`
- **THEN** the parser SHALL return a `FileVariable` with name `baseUrl` and value `https://api.example.com/v1`

#### Scenario: Server URL with template variable having no default
- **WHEN** an OpenAPI spec has `servers: [{ url: "https://{host}/v1", variables: { host: {} } }]`
- **THEN** the parser SHALL return `baseUrl` with value `https://{{host}}/v1` and a `FileVariable` with name `host` and value `""`

### Requirement: Extract operation method and URL
The system SHALL extract the HTTP method from the path key (normalized to uppercase) and construct the URL as `{{baseUrl}}` + path. The method SHALL be one of the supported `HttpMethod` values (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). Operations with unsupported methods SHALL be skipped with a stderr warning.

#### Scenario: Extract method and construct URL
- **WHEN** an OpenAPI spec has path `/users` with a `get` operation
- **THEN** the parsed request SHALL have method `GET` and url `{{baseUrl}}/users`

#### Scenario: Skip unsupported HTTP methods
- **WHEN** an OpenAPI spec has a path with a `trace` operation
- **THEN** the parser SHALL skip that operation and log a warning to stderr

### Requirement: Assign operation name with tag prefix
The system SHALL assign each request a name using the first matching source in priority order: `operationId`, then `summary`, then `"{METHOD} {path}"`. If the operation has a `tags` array with at least one entry, the first tag SHALL be prefixed to the name separated by ` / ` (e.g., `"Users / List users"`).

#### Scenario: Use operationId as name
- **WHEN** an operation has `operationId: "listUsers"` and no tags
- **THEN** the parsed request SHALL have name `listUsers`

#### Scenario: Use summary when operationId is absent
- **WHEN** an operation has `summary: "List all users"` and no `operationId`
- **THEN** the parsed request SHALL have name `List all users`

#### Scenario: Fallback to method and path
- **WHEN** an operation has neither `operationId` nor `summary`
- **THEN** the parsed request SHALL have name `GET /users` (method uppercase + path)

#### Scenario: Prefix with first tag
- **WHEN** an operation has `tags: ["Users"]` and `operationId: "createUser"`
- **THEN** the parsed request SHALL have name `Users / createUser`

#### Scenario: Tag prefix with summary fallback
- **WHEN** an operation has `tags: ["Orders"]` and `summary: "List orders"` and no `operationId`
- **THEN** the parsed request SHALL have name `Orders / List orders`

### Requirement: Assign synthetic line numbers
The system SHALL assign incrementing synthetic `lineNumber` values (1, 2, 3, ...) to each parsed request. Since OpenAPI specs have no file line positions, this ensures unique React keys in the request list.

#### Scenario: Requests receive unique incrementing line numbers
- **WHEN** an OpenAPI spec has three operations
- **THEN** the parsed requests SHALL have `lineNumber` values of `1`, `2`, and `3`

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

### Requirement: Resolve internal $ref for parameters
The system SHALL resolve internal `$ref` references starting with `#/components/` by traversing the parsed JSON document. Parameters defined via `$ref` in `#/components/parameters/` SHALL be resolved and processed identically to inline parameters. External and remote `$ref` references SHALL be logged as warnings and the parameter SHALL be treated as having no default/example.

#### Scenario: Resolve parameter $ref
- **WHEN** an operation has a parameter `{ "$ref": "#/components/parameters/UserIdParam" }` and `components.parameters.UserIdParam` is `{ name: "id", in: "path", schema: { type: integer, default: 1 } }`
- **THEN** the parser SHALL resolve the reference and produce a URL with `{{id}}` and a `FileVariable` with name `id` and value `1`

#### Scenario: Warn on external $ref
- **WHEN** a parameter has `{ "$ref": "./other.json#/UserIdParam" }`
- **THEN** the parser SHALL log a warning to stderr about unsupported external `$ref` and treat the parameter as having no default/example (empty `{{varName}}`)

### Requirement: Map security schemes to auth header placeholders
The system SHALL resolve security requirements for each operation (operation-level `security` overrides global `security`) and map supported security schemes to `{{varName}}` auth headers. The supported schemes are: `http` with `scheme: bearer` (→ `Authorization: Bearer {{<schemeName>}}`), `http` with `scheme: basic` (→ `Authorization: Basic {{<schemeName>}}`), and `apiKey` with `in: header` (→ `<name>: {{<schemeName>}}`). `apiKey` with `in: query` SHALL add the key to the URL query string. `apiKey` with `in: cookie` SHALL add to the `Cookie` header. Unsupported schemes (`oauth2`, `openIdConnect`, `mutualTLS`) SHALL be logged as warnings and skipped. For each auth variable, a `FileVariable` entry SHALL be emitted with an empty value.

#### Scenario: Bearer auth placeholder
- **WHEN** an operation has `security: [{ bearerAuth: [] }]` and `components.securitySchemes.bearerAuth` is `{ type: http, scheme: bearer }`
- **THEN** the parsed request SHALL have header `Authorization: Bearer {{bearerAuth}}` and a `FileVariable` with name `bearerAuth` and value `""` SHALL be present

#### Scenario: Basic auth placeholder
- **WHEN** an operation has `security: [{ basicAuth: [] }]` and `components.securitySchemes.basicAuth` is `{ type: http, scheme: basic }`
- **THEN** the parsed request SHALL have header `Authorization: Basic {{basicAuth}}` and a `FileVariable` with name `basicAuth` and value `""` SHALL be present

#### Scenario: API key in header
- **WHEN** an operation has `security: [{ apiKeyAuth: [] }]` and `components.securitySchemes.apiKeyAuth` is `{ type: apiKey, in: header, name: X-API-Key }`
- **THEN** the parsed request SHALL have header `X-API-Key: {{apiKeyAuth}}` and a `FileVariable` with name `apiKeyAuth` and value `""` SHALL be present

#### Scenario: API key in query
- **WHEN** an operation has `security: [{ apiKeyAuth: [] }]` and `components.securitySchemes.apiKeyAuth` is `{ type: apiKey, in: query, name: api_key }`
- **THEN** the URL SHALL include `api_key={{apiKeyAuth}}` and a `FileVariable` with name `apiKeyAuth` and value `""` SHALL be present

#### Scenario: API key in cookie
- **WHEN** an operation has `security: [{ apiKeyAuth: [] }]` and `components.securitySchemes.apiKeyAuth` is `{ type: apiKey, in: cookie, name: session }`
- **THEN** the parsed request SHALL have header `Cookie: session={{apiKeyAuth}}` and a `FileVariable` with name `apiKeyAuth` and value `""` SHALL be present

#### Scenario: Warn on unsupported security scheme
- **WHEN** an operation has `security: [{ oauth2Auth: [] }]` and `components.securitySchemes.oauth2Auth` is `{ type: oauth2 }`
- **THEN** the parser SHALL log a warning to stderr and not add any auth headers

#### Scenario: No security on operation
- **WHEN** an operation has no `security` field and the spec has no global `security`
- **THEN** the parsed request SHALL have no auth headers added

### Requirement: Synthesize request body from examples
The system SHALL extract the request body based on a multi-tier example lookup. The system SHALL prefer `application/json` content type if present, otherwise use the first content type key. The body lookup order is: (1) `content[mediaType].example` (use verbatim), (2) `content[mediaType].examples[firstKey].value` (use verbatim), (3) resolve schema `$ref` (via the dereference pass) and use `schema.example` (use verbatim), (4) recursively synthesize an example value from the schema: for `type: "object"` with `properties`, iterate each property and recursively synthesize its value, omitting properties whose synthesis returns `undefined`; for `type: "array"` with `items`, recursively synthesize a single example item from `items` and wrap it in a single-element array (if item synthesis returns `undefined`, the array property is omitted); for primitive types (`string`, `integer`, `number`, `boolean`), return `example`, else `default`, else the type name as a placeholder (e.g., `"string"`); the placeholder applies only to nested properties, not the top-level schema; when `type` is an array (nullable unions like `["string", "null"]`), skip the fallback and omit the property; (5) otherwise `body: undefined`. The recursive synthesis SHALL terminate with a warning and return `undefined` if the recursion depth exceeds 50 levels (defensive guard against pathological schemas or unresolved cycles). For `application/x-www-form-urlencoded` content type, the synthesized body SHALL be serialized as `key=value` pairs for top-level primitive properties, using bracket notation (`key[prop]=value`) for nested object properties and repeated keys (`key=val1&key=val2`) for array properties, with all keys and values URL-encoded.

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

#### Scenario: Property $ref with type only uses type as placeholder
- **WHEN** a schema has a property `templateId` with `{ "$ref": "#/components/schemas/TemplateId" }` and `TemplateId` is `{ "type": "string" }` (no `example`, no `default`)
- **THEN** the synthesized body SHALL include `"templateId":"string"`

#### Scenario: Omit properties without type, example, or default
- **WHEN** a schema has a property `notes` with `{ "description": "Internal notes" }` (no `type`, no `example`, no `default`)
- **THEN** the synthesized body SHALL omit `notes` entirely

#### Scenario: No body when no examples exist
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

#### Scenario: Synthesize nested object from per-property examples
- **WHEN** an operation has `requestBody.content.application/json.schema.$ref: "#/components/schemas/Order"` and `Order` has properties `currency` (example: "USD") and `customer` which is `{ type: "object", properties: { name: { type: "string", example: "Alice" }, email: { type: "string", example: "alice@example.com" } } }` (no top-level `example`)
- **THEN** the parsed request SHALL have body `{"currency":"USD","customer":{"name":"Alice","email":"alice@example.com"}}`

#### Scenario: Synthesize nested object with type placeholders when no examples exist
- **WHEN** a schema has a property `metadata` which is `{ type: "object", properties: { source: { type: "string" } } }` (no examples anywhere in the nested schema)
- **THEN** the synthesized body SHALL include `"metadata":{"source":"string"}` (type-name placeholders used for type-only properties)

#### Scenario: Synthesize array of object refs
- **WHEN** an operation has `requestBody.content.application/json.schema: { type: "array", items: { "$ref": "#/components/schemas/LineItem" } }` and `LineItem` has properties `sku` (example: "W-001") and `quantity` (example: 2)
- **THEN** the parsed request SHALL have body `[{"sku":"W-001","quantity":2}]`

#### Scenario: Synthesize array of primitives
- **WHEN** an operation has `requestBody.content.application/json.schema: { type: "array", items: { type: "string", example: "priority" } }`
- **THEN** the parsed request SHALL have body `["priority"]`

#### Scenario: Synthesize array with type placeholder when items have no examples
- **WHEN** a schema has a property `tags` which is `{ type: "array", items: { type: "string" } }` (no example on items)
- **THEN** the synthesized body SHALL include `"tags":["string"]` (type-name placeholder for items)

#### Scenario: Synthesize deeply-nested object (3+ levels)
- **WHEN** a schema has property `order` which is `{ type: "object", properties: { customer: { type: "object", properties: { name: { type: "string", example: "Alice" } } } } }`
- **THEN** the synthesized body SHALL include `"order":{"customer":{"name":"Alice"}}`

#### Scenario: Primitive property uses default when no example
- **WHEN** a schema has property `count` which is `{ type: "integer", default: 10 }` (no example)
- **THEN** the synthesized body SHALL include `"count":10`

#### Scenario: Urlencoded body with nested object uses bracket notation
- **WHEN** an operation has `requestBody.content.application/x-www-form-urlencoded.schema.$ref: "#/components/schemas/Form"` and `Form` has properties `name` (example: "John") and `address` which is `{ type: "object", properties: { city: { type: "string", example: "SF" } } }`
- **THEN** the parsed request SHALL have body `name=John&address[city]=SF` and header `Content-Type: application/x-www-form-urlencoded`

#### Scenario: Urlencoded body with array uses repeated keys
- **WHEN** an operation has `requestBody.content.application/x-www-form-urlencoded.schema.$ref: "#/components/schemas/Form"` and `Form` has a property `tags` which is `{ type: "array", items: { type: "string", example: "vip" } }`
- **THEN** the parsed request SHALL have body `tags=vip` (single-element array produces one repeated key) and header `Content-Type: application/x-www-form-urlencoded`

#### Scenario: External $ref stub in schema property is omitted
- **WHEN** a schema has a property `external` which is `{ "$ref": "./other.json#/Foo" }` (left as a stub by the dereference pass)
- **THEN** the synthesized body SHALL omit `external` entirely (treated as `undefined`)

#### Scenario: Composition keywords produce no body
- **WHEN** an operation has `requestBody.content.application/json.schema: { allOf: [{ "$ref": "#/components/schemas/Base" }, { properties: { name: { type: "string", example: "Alice" } } }] }`
- **THEN** the parsed request SHALL have `body: undefined` (composition keywords are not yet supported)

### Requirement: Skip webhooks
The system SHALL skip `webhooks` entries in OpenAPI 3.1 specs. Webhooks represent incoming events, not sendable requests, and SHALL not produce `ParsedRequest` entries. No warning SHALL be logged for webhooks.

#### Scenario: Webhooks are skipped
- **WHEN** an OpenAPI 3.1 spec has `webhooks: { "user.created": { post: { ... } } }`
- **THEN** the parser SHALL not produce any `ParsedRequest` for the webhook and SHALL not log a warning

### Requirement: Log warnings for unsupported features
The system SHALL log warning messages to stderr when encountering unsupported OpenAPI features. Warnings SHALL use yellow ANSI coloring consistent with the existing `--insecure` warning pattern. Warnings SHALL include the feature name and a brief reason.

#### Scenario: Warn on unsupported HTTP method
- **WHEN** an operation uses method `trace`
- **THEN** the parser SHALL log a warning to stderr and skip the operation

#### Scenario: Warn on external $ref
- **WHEN** a schema or parameter uses `$ref` pointing to an external file or URL
- **THEN** the parser SHALL log a warning to stderr and treat the referenced item as unresolved

#### Scenario: Warn on unsupported security scheme
- **WHEN** an operation requires an `oauth2` security scheme
- **THEN** the parser SHALL log a warning to stderr and skip auth for that operation

#### Scenario: No warnings for fully supported operations
- **WHEN** an OpenAPI spec has only GET/POST operations with path parameters, bearer auth, and JSON bodies with examples
- **THEN** the parser SHALL not log any warnings

### Requirement: Extend format detection to recognize OpenAPI
The system SHALL extend the `detectFormat` function to return `'openapi'` when the parsed JSON contains a top-level `openapi` field with a string value. The `swagger` field (v2.0) SHALL also be detected as `'openapi'` but the parser SHALL log a warning that Swagger 2.0 is not yet supported. The detection SHALL check `openapi` before Postman's `info.schema` to avoid misclassification.

#### Scenario: Detect OpenAPI 3.x
- **WHEN** a `.json` file contains `{ "openapi": "3.0.3", "paths": {} }`
- **THEN** `detectFormat` SHALL return `'openapi'`

#### Scenario: Detect Swagger 2.0 as openapi (with warning)
- **WHEN** a `.json` file contains `{ "swagger": "2.0", "paths": {} }`
- **THEN** `detectFormat` SHALL return `'openapi'` and the parser SHALL log a warning that Swagger 2.0 is not supported

#### Scenario: Non-JSON file defaults to http
- **WHEN** a file has extension `.http` or `.rest`
- **THEN** `detectFormat` SHALL return `'http'` without parsing

#### Scenario: Postman collection not misclassified as OpenAPI
- **WHEN** a `.json` file contains a Postman collection with `info.schema` containing "postman"
- **THEN** `detectFormat` SHALL return `'postman'` (OpenAPI check runs first but finds no `openapi` field)

### Requirement: Resolve nested `$ref` recursively across the document
The system SHALL resolve internal `$ref` references of arbitrary depth across the entire parsed OpenAPI document before extracting requests. Resolution SHALL cover parameters, request bodies, schema properties, and `$ref` chains (where a referenced schema itself contains a `$ref`). The system SHALL perform this resolution via a single dereference pass over the parsed JSON document, replacing every internal `$ref` (`#/...`) in-place with its target object. External and remote `$ref` references (anything not starting with `#/`) SHALL be left as unresolved stubs and the existing external-`$ref` warning behavior at the call site SHALL still fire.

#### Scenario: Resolve `$ref` chain (A → B → C)
- **WHEN** a schema has `{ "$ref": "#/components/schemas/A" }` and `components.schemas.A` is `{ "$ref": "#/components/schemas/B" }` and `components.schemas.B` is `{ "$ref": "#/components/schemas/C" }` and `components.schemas.C` is `{ "type": "object", "example": { "id": 1 } }`
- **THEN** the parser SHALL resolve the chain to C's content and the synthesized body SHALL be `{"id":1}`

#### Scenario: Resolve `$ref` in schema property with top-level example on sub-schema
- **WHEN** an operation has a requestBody with `schema.$ref: "#/components/schemas/Order"`, and `Order.properties.shipping` is `{ "$ref": "#/components/schemas/Address" }`, and `Address` has a top-level `example: { "street": "123 Main St" }`
- **THEN** the parser SHALL resolve `shipping`'s `$ref` to `Address`, and the synthesized body SHALL include `"shipping":{"street":"123 Main St"}`

#### Scenario: Resolve `$ref` in requestBody directly
- **WHEN** an operation has `requestBody.$ref: "#/components/requestBodies/OrderBody"`, and `components.requestBodies.OrderBody` has `content.application/json.example: { "id": 1 }`
- **THEN** the parser SHALL resolve the requestBody `$ref` and the synthesized body SHALL be `{"id":1}` with `Content-Type: application/json`

#### Scenario: Resolve `$ref` in parameter schema
- **WHEN** an operation has a parameter with `schema.$ref: "#/components/schemas/LimitSchema"`, and `components.schemas.LimitSchema` is `{ "type": "integer", "default": 20 }`
- **THEN** the parser SHALL resolve the schema `$ref` and the parameter's `FileVariable` value SHALL be `20`

#### Scenario: Diamond reference is not a cycle
- **WHEN** schema `Order` has properties `billing` and `shipping`, both with `$ref: "#/components/schemas/Address"`, and `Address` has a top-level `example`
- **THEN** the parser SHALL resolve both `billing` and `shipping` to `Address`'s content and SHALL NOT log a circular-`$ref` warning

#### Scenario: External `$ref` remains unresolved with warning at call site
- **WHEN** a schema property has `{ "$ref": "./other.json#/Foo" }`
- **THEN** the dereference pass SHALL leave the `$ref` stub in place, the existing call-site resolution SHALL log a warning about unsupported external `$ref`, and the property SHALL be treated as having no example (omitted from synthesis)

### Requirement: Detect and guard circular `$ref`
The system SHALL detect circular internal `$ref` references using a path-scoped visited set. When a `$ref` is encountered that is already on the current resolution path, the system SHALL log a warning to stderr with the message `Circular $ref "<ref>" — stop resolving` (where `<ref>` is the offending `$ref` string) and stop recursing into that branch. The unresolved `$ref` stub SHALL be left in place so that downstream synthesis treats it as "no example" (omitted from the synthesized body). The visited set SHALL be path-scoped: a `$ref` is removed from the set when the recursion exits the corresponding branch, so that diamond-shaped references (the same sub-schema referenced from sibling branches) do not produce false-positive cycle warnings.

#### Scenario: Direct self-cycle A → A
- **WHEN** schema `A` is defined as `{ "$ref": "#/components/schemas/A" }`
- **THEN** the parser SHALL log a warning containing `Circular $ref "#/components/schemas/A"` and stop resolving, and parsing SHALL complete without throwing

#### Scenario: Indirect cycle A → B → A
- **WHEN** schema `A` has `{ "$ref": "#/components/schemas/B" }` and schema `B` has `{ "$ref": "#/components/schemas/A" }`
- **THEN** the parser SHALL log a warning containing `Circular $ref "#/components/schemas/A"` when re-encountering A, stop resolving that branch, and parsing SHALL complete without throwing

#### Scenario: No warning for acyclic nested `$ref`
- **WHEN** a spec has three or more nested `$ref` references with no cycle (e.g., `Order → Customer → Address`)
- **THEN** the parser SHALL resolve all references and SHALL NOT log any circular-`$ref` warning

#### Scenario: Circular `$ref` warning does not suppress other operations
- **WHEN** a spec has one operation whose body schema contains a cycle, and another operation whose body schema is acyclic
- **THEN** the parser SHALL log the cycle warning for the first operation, produce an empty body for that operation, and produce a fully-synthesized body for the second operation

