## MODIFIED Requirements

### Requirement: Request line parsing

The parser SHALL parse request lines in the format `METHOD URL` or `METHOD URL HTTP/version`. The URL portion SHALL support `{{...}}` variable expressions containing space-separated arguments (e.g., `{{$randomInt 1 100}}`). Bare spaces outside `{{...}}` expressions SHALL end the URL portion as before.

#### Scenario: URL with space-containing variable expression
- **WHEN** a request line contains `GET {{baseUrl}}/posts/{{$randomInt 1 100}}`
- **THEN** the parser SHALL extract method `GET` and URL `{{baseUrl}}/posts/{{$randomInt 1 100}}`

#### Scenario: URL without spaces (existing behavior)
- **WHEN** a request line contains `GET https://api.example.com/users`
- **THEN** the parser SHALL extract method `GET` and URL `https://api.example.com/users`

#### Scenario: URL with HTTP version suffix
- **WHEN** a request line contains `POST https://api.example.com/users HTTP/1.1`
- **THEN** the parser SHALL extract method `POST` and URL `https://api.example.com/users` (ignoring the HTTP version)

#### Scenario: Bare spaces still delimit the URL
- **WHEN** a request line contains bare spaces outside `{{...}}` expressions (not followed by `HTTP/`)
- **THEN** the parser SHALL NOT match the line as a valid request (same behavior as before)