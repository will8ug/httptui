## MODIFIED Requirements

### Requirement: Synthesize request body from examples
The system SHALL extract the request body based on a multi-tier example lookup. The system SHALL prefer `application/json` content type if present, otherwise use the first content type key. The body lookup order is: (1) `content[mediaType].example` (use verbatim), (2) `content[mediaType].examples[firstKey].value` (use verbatim), (3) resolve schema `$ref` (via the dereference pass) and use `schema.example` (use verbatim), (4) recursively synthesize an example value from the schema: for `type: "object"` with `properties`, iterate each property and recursively synthesize its value, omitting properties whose synthesis returns `undefined`; for `type: "array"` with `items`, recursively synthesize a single example item from `items` and wrap it in a single-element array (if item synthesis returns `undefined`, the array property is omitted); for primitive types (`string`, `integer`, `number`, `boolean`) with `example` or `default`, return that value; (5) otherwise `body: undefined`. The recursive synthesis SHALL terminate with a warning and return `undefined` if the recursion depth exceeds 50 levels (defensive guard against pathological schemas or unresolved cycles). For `application/x-www-form-urlencoded` content type, the synthesized body SHALL be serialized as `key=value` pairs for top-level primitive properties, using bracket notation (`key[prop]=value`) for nested object properties and repeated keys (`key=val1&key=val2`) for array properties, with all keys and values URL-encoded.

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
- **WHEN** an operation has `requestBody.content.application/json.schema.$ref: "#/components/schemas/DemoItem"` and `DemoItem` has properties `id` (example: 1), `name` (example: "Widget"), `description` (example: "A widget")
- **THEN** the parsed request SHALL have body `{"id":1,"name":"Widget","description":"A widget"}`

#### Scenario: Omit properties without examples in synthesis
- **WHEN** a schema has properties `name` (example: "Widget") and `secret` (no example)
- **THEN** the synthesized body SHALL be `{"name":"Widget"}` (secret omitted)

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

#### Scenario: Omit nested object property when no nested examples exist
- **WHEN** a schema has a property `metadata` which is `{ type: "object", properties: { source: { type: "string" } } }` (no examples anywhere in the nested schema)
- **THEN** the synthesized body SHALL omit `metadata` entirely (no `{"metadata":{}}`)

#### Scenario: Synthesize array of object refs
- **WHEN** an operation has `requestBody.content.application/json.schema: { type: "array", items: { "$ref": "#/components/schemas/LineItem" } }` and `LineItem` has properties `sku` (example: "W-001") and `quantity` (example: 2)
- **THEN** the parsed request SHALL have body `[{"sku":"W-001","quantity":2}]`

#### Scenario: Synthesize array of primitives
- **WHEN** an operation has `requestBody.content.application/json.schema: { type: "array", items: { type: "string", example: "priority" } }`
- **THEN** the parsed request SHALL have body `["priority"]`

#### Scenario: Omit array property when items have no examples
- **WHEN** a schema has a property `tags` which is `{ type: "array", items: { type: "string" } }` (no example on items)
- **THEN** the synthesized body SHALL omit `tags` entirely (no `{"tags":[]}`)

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
