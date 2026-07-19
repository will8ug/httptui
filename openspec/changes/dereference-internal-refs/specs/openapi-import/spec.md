## ADDED Requirements

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
