# Spec: Postman Collection Import

## Purpose

Parse Postman Collection v2.1 JSON files into httptui's internal `ParseResult` format using the official `postman-collection` SDK. This enables httptui to serve as a terminal-based client for Postman collections, supporting the most common 80% of real-world collection features (requests, auth, variables, and body modes) while logging warnings for unsupported features.

## Requirements

### Requirement: Parse Postman Collection v2.1 JSON
The system SHALL parse Postman Collection v2.1 JSON files into the internal `ParseResult` format using the `postman-collection` SDK. The parser SHALL extract all items (including nested folder items) as flat `ParsedRequest[]` entries. The parser SHALL return an empty requests array for empty or invalid collections.

#### Scenario: Parse a basic collection with a single GET request
- **WHEN** a Postman collection JSON contains one item with method `GET` and URL `https://api.example.com/users`
- **THEN** the parser SHALL return a `ParseResult` with one `ParsedRequest` having method `GET` and url `https://api.example.com/users`

#### Scenario: Parse a collection with multiple requests
- **WHEN** a Postman collection JSON contains three items (GET, POST, DELETE)
- **THEN** the parser SHALL return three `ParsedRequest` objects in the order they appear in the collection

#### Scenario: Parse a collection with nested folders
- **WHEN** a Postman collection has a folder "Users" containing two requests "List Users" and "Create User"
- **THEN** the parser SHALL flatten both requests into the top-level array with names prefixed as "Users / List Users" and "Users / Create User"

#### Scenario: Parse an empty collection
- **WHEN** a Postman collection JSON has no items
- **THEN** the parser SHALL return a `ParseResult` with an empty requests array and an empty variables array

#### Scenario: Parse a collection with collection-level variables
- **WHEN** a Postman collection has a variable `baseUrl` with value `https://api.example.com`
- **THEN** the parser SHALL return a `FileVariable` with name `baseUrl` and value `https://api.example.com`

#### Scenario: Parse a collection with no variables
- **WHEN** a Postman collection has no `variable` array
- **THEN** the parser SHALL return a `ParseResult` with an empty variables array

### Requirement: Extract request method and URL
The system SHALL extract the HTTP method from `request.method` (normalized to uppercase) and the full URL from the SDK's `url.toString()` method, which reconstructs the URL from structured parts (protocol, host, path, query). The method SHALL be one of the supported `HttpMethod` values (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS).

#### Scenario: Extract method and URL from raw URL field
- **WHEN** a Postman request has method `post` and `url.raw` is `https://api.example.com/users`
- **THEN** the parsed request SHALL have method `POST` and url `https://api.example.com/users`

#### Scenario: Reconstruct URL from structured parts
- **WHEN** a Postman request has a structured URL with protocol `https`, host `["api", "example", "com"]`, and path `["users", "123"]`
- **THEN** the SDK SHALL reconstruct the URL as `https://api.example.com/users/123`

#### Scenario: Skip requests with unsupported HTTP methods
- **WHEN** a Postman request has method `PROPFIND` (not in the supported set)
- **THEN** the parser SHALL skip that request and log a warning to stderr

### Requirement: Extract headers
The system SHALL convert the Postman header array `[{key: "Content-Type", value: "application/json"}]` to a `Record<string, string>` where the key is the header name and the value is the header value. Duplicate header keys SHALL use the last occurrence (matching httptui's existing behavior).

#### Scenario: Extract headers from request
- **WHEN** a Postman request has headers `Content-Type: application/json` and `Authorization: Bearer token123`
- **THEN** the parsed request SHALL have headers `{ "Content-Type": "application/json", "Authorization": "Bearer token123" }`

#### Scenario: Request with no headers
- **WHEN** a Postman request has an empty `header` array
- **THEN** the parsed request SHALL have an empty headers object `{}`

### Requirement: Extract request body
The system SHALL extract the request body based on body mode. For `raw` mode, the raw string SHALL be used directly. For `urlencoded` mode, the key-value array SHALL be converted to a `key=val&key2=val2` string and a `Content-Type: application/x-www-form-urlencoded` header SHALL be injected. For `formdata` mode with only text fields (no file fields), the parser SHALL populate `formdataFields` on the parsed request with each field's key, value, and type, and inject a `Content-Type: multipart/form-data` header (informational for display — the actual boundary is auto-generated at send time). For `formdata` mode containing file fields, the parser SHALL log a warning and set body to `undefined`. For `file` and `graphql` modes, the parser SHALL log a warning and set body to `undefined`.

#### Scenario: Extract raw JSON body
- **WHEN** a Postman request has body mode `raw` with content `{"name": "Alice"}`
- **THEN** the parsed request SHALL have body `{"name": "Alice"}`

#### Scenario: Extract urlencoded body
- **WHEN** a Postman request has body mode `urlencoded` with fields `[{key: "name", value: "Alice"}, {key: "age", value: "30"}]`
- **THEN** the parsed request SHALL have body `name=Alice&age=30` and headers SHALL include `Content-Type: application/x-www-form-urlencoded`

#### Scenario: Extract text-only formdata body
- **WHEN** a Postman request has body mode `formdata` with fields `[{key: "username", value: "alice", type: "text"}, {key: "email", value: "alice@example.com", type: "text"}]`
- **THEN** the parsed request SHALL have `formdataFields` with two entries `[{key: "username", value: "alice", type: "text"}, {key: "email", value: "alice@example.com", type: "text"}]`, body SHALL be `undefined`, and headers SHALL include `Content-Type: multipart/form-data`

#### Scenario: Warn on formdata with file upload
- **WHEN** a Postman request has body mode `formdata` containing a file field with `type: "file"`
- **THEN** the parser SHALL log a warning to stderr and set body to `undefined`

#### Scenario: Request with no body
- **WHEN** a Postman request has body mode `raw` with empty content
- **THEN** the parsed request SHALL have body `undefined`

### Requirement: Convert auth to headers
The system SHALL convert supported auth types to standard HTTP headers. Basic auth SHALL produce `Authorization: Basic <base64(user:pass)>`. Bearer auth SHALL produce `Authorization: Bearer <token>`. API Key auth with `in: "header"` SHALL add the specified key-value pair as a header. Unsupported auth types SHALL be logged as warnings.

#### Scenario: Convert Basic auth to header
- **WHEN** a Postman request has auth type `basic` with username `admin` and password `secret`
- **THEN** the parsed request SHALL include header `Authorization: Basic YWRtaW46c2VjcmV0`

#### Scenario: Convert Bearer auth to header
- **WHEN** a Postman request has auth type `bearer` with token `abc123`
- **THEN** the parsed request SHALL include header `Authorization: Bearer abc123`

#### Scenario: Convert API Key auth to header
- **WHEN** a Postman request has auth type `apikey` with key `X-API-Key`, value `mykey`, and `in: "header"`
- **THEN** the parsed request SHALL include header `X-API-Key: mykey`

#### Scenario: Warn on unsupported auth type
- **WHEN** a Postman request has auth type `oauth2`
- **THEN** the parser SHALL log a warning to stderr and not add any auth headers

### Requirement: Assign synthetic line numbers
The system SHALL assign incrementing synthetic `lineNumber` values (1, 2, 3, ...) to each parsed request. Since Postman collections have no file line positions, this ensures unique React keys in the request list.

#### Scenario: Requests receive unique incrementing line numbers
- **WHEN** a Postman collection has three requests
- **THEN** the parsed requests SHALL have `lineNumber` values of `1`, `2`, and `3`

### Requirement: Request name assignment
The system SHALL use the Postman item name as the request name. For items inside folders, the name SHALL be prefixed with the folder name(s) separated by ` / `. If an item has no name, the system SHALL auto-generate `Request N` where N is the 1-based request index.

#### Scenario: Use item name as request name
- **WHEN** a Postman item has name "Get All Users"
- **THEN** the parsed request SHALL have name "Get All Users"

#### Scenario: Prefix folder name for nested items
- **WHEN** a Postman item "Create User" is inside folder "Users"
- **THEN** the parsed request SHALL have name "Users / Create User"

#### Scenario: Auto-generate name for unnamed items
- **WHEN** a Postman item has no name
- **THEN** the parsed request SHALL have name "Request N" where N is the request's index

### Requirement: Log warnings for unsupported features
The system SHALL log warning messages to stderr when encountering unsupported Postman features. Warnings SHALL include a description of what was skipped and SHALL use yellow ANSI coloring consistent with the existing `--insecure` warning pattern.

#### Scenario: Warn about pre-request scripts
- **WHEN** a Postman request has an `event` with a `pre-request` script
- **THEN** the parser SHALL log a warning to stderr indicating that scripts are not supported

#### Scenario: Warn about test scripts
- **WHEN** a Postman request has an `event` with a `test` script
- **THEN** the parser SHALL log a warning to stderr indicating that scripts are not supported

#### Scenario: No warnings for fully supported requests
- **WHEN** a Postman collection has only basic GET/POST requests with raw bodies and no scripts
- **THEN** the parser SHALL not log any warnings
