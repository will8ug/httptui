## MODIFIED Requirements

### Requirement: Request execution behavior
The executor SHALL use `undici.request()` for HTTP calls, NOT follow redirects, use a 30-second timeout, and NOT retry failed requests. The executor SHALL NOT synthesize or modify the `Content-Type` header for a raw body: it SHALL send the request's `Content-Type` header only when one is explicitly present, and SHALL NOT add one when absent, regardless of the body content.

#### Scenario: JSON content type auto-detection
- **WHEN** a request has a body that looks like JSON and no explicit Content-Type header
- **THEN** the executor SHALL NOT set a Content-Type header

#### Scenario: Non-JSON body without explicit Content-Type
- **WHEN** a request has a body that does not look like JSON and no explicit Content-Type header
- **THEN** the executor SHALL NOT set a Content-Type header

#### Scenario: Explicit Content-Type is sent as-is
- **WHEN** a request has a body and an explicit `Content-Type: application/json` header
- **THEN** the executor SHALL send `Content-Type: application/json` and SHALL NOT modify it
