## MODIFIED Requirements

### Requirement: Display resolved request details
The request details panel SHALL display the fully resolved request for the currently selected request, including: HTTP method, resolved URL (with all `{{variable}}` substitutions applied), resolved headers, resolved formdata fields (when the request uses a formdata body), and resolved body (if present). Variable resolution SHALL use the same `resolveVariables()` function that is used when sending requests.

#### Scenario: Display request with variables resolved
- **WHEN** the request details panel is visible and the selected request contains `{{baseUrl}}` in the URL and `{{$dotenv API_KEY}}` in headers
- **THEN** the panel SHALL show the URL with `baseUrl` substituted and the header with the env variable value substituted

#### Scenario: Display request with no body
- **WHEN** the selected request is a GET request with no body
- **THEN** the panel SHALL display the method and URL, and omit the body section entirely

#### Scenario: Display request with body
- **WHEN** the selected request has a body (e.g., POST with JSON payload)
- **THEN** the panel SHALL display the request body after the method, URL, and headers sections

#### Scenario: Display request with formdata fields
- **WHEN** the selected request carries `formdataFields`
- **THEN** the panel SHALL display each formdata field line between the headers and body sections
