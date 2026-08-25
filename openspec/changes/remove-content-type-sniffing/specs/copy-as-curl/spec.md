## MODIFIED Requirements

### Requirement: Content-Type mirrors executor defaulting
The serializer SHALL apply the same `Content-Type` rule as the request executor: it SHALL NOT synthesize a `Content-Type` header for the body. The serializer SHALL emit the request's own `Content-Type` header when one is present, and SHALL NOT add one when absent, regardless of the body content.

#### Scenario: JSON-looking body without Content-Type gains the header
- **WHEN** the resolved request has body `{"name":"Alice"}` and no `Content-Type` header
- **THEN** the command SHALL NOT contain a Content-Type header

#### Scenario: Explicit Content-Type is not duplicated
- **WHEN** the resolved request has body `<xml/>` and header `Content-Type: application/xml`
- **THEN** the command SHALL contain exactly one Content-Type header, `application/xml`

#### Scenario: Non-JSON body without Content-Type gains nothing
- **WHEN** the resolved request has body `plain text` and no `Content-Type` header
- **THEN** the command SHALL NOT contain a Content-Type header
