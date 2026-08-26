## MODIFIED Requirements

### Requirement: Request execution behavior
The executor SHALL use `undici.request()` for HTTP calls, NOT follow redirects, impose NO overall request deadline, and NOT retry failed requests. Connection-level and inactivity limits SHALL remain at the HTTP client's defaults, so a server that responds slowly but stays active SHALL complete successfully. The executor SHALL accept an optional external abort signal; when that signal fires, the executor SHALL abort the request. The executor SHALL NOT synthesize or modify the `Content-Type` header for a raw body: it SHALL send the request's `Content-Type` header only when one is explicitly present, and SHALL NOT add one when absent, regardless of the body content.

#### Scenario: JSON body without explicit Content-Type
- **WHEN** a request has a body that looks like JSON and no explicit Content-Type header
- **THEN** the executor SHALL NOT set a Content-Type header

#### Scenario: Non-JSON body without explicit Content-Type
- **WHEN** a request has a body that does not look like JSON and no explicit Content-Type header
- **THEN** the executor SHALL NOT set a Content-Type header

#### Scenario: Explicit Content-Type is sent as-is
- **WHEN** a request has a body and an explicit `Content-Type: application/json` header
- **THEN** the executor SHALL send `Content-Type: application/json` and SHALL NOT modify it

#### Scenario: Slow response completes
- **WHEN** a server takes longer than 30 seconds to produce its final response but remains connected
- **THEN** the executor SHALL return the response as a valid `ResponseData` object

#### Scenario: External abort signal cancels the request
- **WHEN** an abort signal is supplied and fires while the request is in flight
- **THEN** the executor SHALL abort the request and surface the abort to the caller
