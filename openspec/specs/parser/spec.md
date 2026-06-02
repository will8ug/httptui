# Spec: .http File Parser

## Purpose

Parse `.http` and `.rest` files into a structured array of `ParsedRequest` objects. The parser is a line-by-line state machine with zero external dependencies.

## Requirements

### Requirement: Request separation
The parser SHALL use `###` (three or more `#` characters) to separate requests. Text after `###` on the same line SHALL be the request name. The first request in a file SHALL NOT require a preceding `###`.

#### Scenario: Multiple requests separated by ### delimiter
- **WHEN** a `.http` file contains two requests separated by a `###` line
- **THEN** both requests SHALL be parsed as separate `ParsedRequest` objects

#### Scenario: Request name extracted from delimiter line
- **WHEN** a `###` line contains text after the hashes (e.g., `### Get all users`)
- **THEN** the text SHALL be used as the request name

### Requirement: File variables
File-level variables SHALL be declared with `@name = value` syntax outside any request block. Variable names SHALL be alphanumeric plus underscore. Values SHALL be trimmed. File variables MAY reference system variables. Variable resolution is specified in the `variables` spec.

#### Scenario: File variable declaration and reference
- **WHEN** a file contains `@hostname = api.example.com` and a request URL contains `{{hostname}}`
- **THEN** the `{{hostname}}` placeholder SHALL be replaced with `api.example.com`

### Requirement: Comments
Lines starting with `#` (but NOT `###`) SHALL be treated as comments and ignored. Lines starting with `//` SHALL also be treated as comments. Comments MAY appear anywhere in the file.

#### Scenario: Comment lines ignored
- **WHEN** a `.http` file contains `# this is a comment` and `// another comment`
- **THEN** both lines SHALL be ignored during parsing

### Requirement: Request line parsing
The request line SHALL have format `METHOD URL [HTTP/VERSION]`. METHOD SHALL be case-insensitive, normalized to uppercase. URL MAY contain `{{variable}}` placeholders, including expressions with space-separated arguments (e.g., `{{$randomInt 1 100}}`). HTTP version is optional and SHALL be ignored.

#### Scenario: Method normalized to uppercase
- **WHEN** a request line is `post https://api.example.com/users`
- **THEN** the parsed request SHALL have method `POST`

#### Scenario: URL with variable placeholders
- **WHEN** a request line URL contains `{{hostname}}` and `{{$randomInt 1 100}}`
- **THEN** the placeholders SHALL be preserved in the parsed URL (resolved later per `variables` spec)

### Requirement: Header parsing
Headers SHALL follow the format `Header-Name: Header-Value`, one per line. Headers SHALL continue until a blank line, `###`, or EOF. Duplicate header names SHALL use the last value.

#### Scenario: Headers parsed from request
- **WHEN** a request has headers `Content-Type: application/json` and `Authorization: Bearer token123`
- **THEN** the parsed request SHALL have headers `{ "Content-Type": "application/json", "Authorization": "Bearer token123" }`

#### Scenario: Duplicate headers use last value
- **WHEN** a request has two `Accept` headers with different values
- **THEN** the parsed request SHALL use the last `Accept` value

### Requirement: Body parsing
The body SHALL be everything after the first blank line following headers, until `###` or EOF. Leading and trailing blank lines in the body SHALL be trimmed. If no blank line follows headers, the body SHALL be undefined.

#### Scenario: Body extracted after blank line
- **WHEN** a POST request has headers followed by a blank line then `{"name": "Alice"}`
- **THEN** the parsed request SHALL have body `{"name": "Alice"}`

#### Scenario: No blank line means no body
- **WHEN** a GET request has headers but no blank line before the next `###`
- **THEN** the parsed request SHALL have body undefined

### Requirement: Whitespace handling
Blank lines SHALL separate headers from body. Trailing whitespace on lines SHALL be trimmed. Empty lines between `###` and the request line SHALL be skipped.

#### Scenario: Empty lines between ### and request are skipped
- **WHEN** a `###` separator has two empty lines before the request line
- **THEN** the empty lines SHALL be ignored and the request SHALL be parsed correctly

### Requirement: Edge cases
The parser SHALL handle: empty files (return empty array), files with only comments (return empty array), requests with no headers and no body, requests with headers but no body, `###` with no following request (ignored), and URLs with query params (preserved as-is).

#### Scenario: Empty file returns empty array
- **WHEN** a `.http` file contains no content
- **THEN** the parser SHALL return an empty `ParsedRequest` array

#### Scenario: File with only comments returns empty array
- **WHEN** a `.http` file contains only `# comment` lines
- **THEN** the parser SHALL return an empty `ParsedRequest` array