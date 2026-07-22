# Delta: openapi-import

## ADDED Requirements

### Requirement: Reject unparseable content with OpenAPI markers
The system SHALL fail with an explicit error when a file's raw content contains a top-level OpenAPI marker key (`openapi:` or `swagger:` for YAML; `"openapi"` or `"swagger"` for JSON) but the content cannot be parsed in the format implied by the file extension. The error message SHALL name the failed format (`invalid YAML` or `invalid JSON`). Files whose content parses successfully but contains no OpenAPI marker SHALL NOT trigger this error. The marker check SHALL only match top-level keys — indented occurrences and comments SHALL be ignored.

#### Scenario: Malformed YAML with OpenAPI marker
- **WHEN** a `.yaml` file's content contains a top-level `openapi:` key but is not valid YAML
- **THEN** loading the file SHALL fail with an error message containing `invalid YAML`

#### Scenario: Malformed JSON with OpenAPI marker
- **WHEN** a `.json` file's content contains an `"openapi"` or `"swagger"` key but is not valid JSON
- **THEN** loading the file SHALL fail with an error message containing `invalid JSON`

#### Scenario: Valid YAML without markers falls through silently
- **WHEN** a `.yaml` file contains valid YAML with no top-level `openapi` or `swagger` key
- **THEN** the file SHALL be treated as an `.http` file with no error

#### Scenario: Nested or commented marker lines are ignored
- **WHEN** a `.yaml` file contains `openapi:` only as an indented (nested) key or inside a comment
- **THEN** the marker check SHALL NOT match and the file SHALL be treated as an `.http` file with no error

## MODIFIED Requirements

### Requirement: Parse OpenAPI 3.x JSON
The system SHALL parse OpenAPI 3.x documents provided as JSON or YAML files into the internal `ParseResult` format. The parser SHALL iterate over `paths` and, for each path+method pair, create one `ParsedRequest` entry. The parser SHALL return an empty requests array for specs with no paths.

#### Scenario: Parse a basic spec with a single GET operation
- **WHEN** an OpenAPI 3.x document contains one path `/users` with a `get` operation
- **THEN** the parser SHALL return a `ParseResult` with one `ParsedRequest` having method `GET` and url `{{baseUrl}}/users`

#### Scenario: Parse a YAML spec
- **WHEN** a `.yaml` file contains an OpenAPI 3.x document with one path `/users` with a `get` operation
- **THEN** loading the file SHALL produce a `ParseResult` with one `ParsedRequest` having method `GET` and url `{{baseUrl}}/users`

#### Scenario: Parse a spec with multiple operations on the same path
- **WHEN** an OpenAPI 3.x document has path `/users/{id}` with `get`, `put`, and `delete` operations
- **THEN** the parser SHALL return three `ParsedRequest` objects, one per method, in the order they appear in the path object

#### Scenario: Parse an empty spec
- **WHEN** an OpenAPI 3.x document has no `paths` field or an empty `paths` object
- **THEN** the parser SHALL return a `ParseResult` with an empty requests array and a `@baseUrl` variable if servers are present

#### Scenario: Warn on Swagger 2.0 spec
- **WHEN** a document has a `swagger` field (version 2.0) but no `openapi` field
- **THEN** the parser SHALL log a warning to stderr that Swagger 2.0 is not supported and return a `ParseResult` with an empty requests array

### Requirement: Extend format detection to recognize OpenAPI
The system SHALL detect OpenAPI input based on file extension: `.json` files SHALL be JSON-parsed and `.yaml`/`.yml` files SHALL be YAML-parsed; detection SHALL return `'openapi'` when the parsed document contains a top-level `openapi` field. The `swagger` field (v2.0) SHALL also be detected as `'openapi'` but the parser SHALL log a warning that Swagger 2.0 is not yet supported. Version field values SHALL be coerced to strings so that unquoted YAML scalars (e.g. `swagger: 2.0` parsed as a number) are still detected. The detection SHALL check `openapi` before Postman's `info.schema` to avoid misclassification. Files with any other extension SHALL return `'http'` without parsing.

#### Scenario: Detect OpenAPI 3.x JSON
- **WHEN** a `.json` file contains `{ "openapi": "3.0.3", "paths": {} }`
- **THEN** `detectFormat` SHALL return `'openapi'`

#### Scenario: Detect Swagger 2.0 JSON as openapi (with warning)
- **WHEN** a `.json` file contains `{ "swagger": "2.0", "paths": {} }`
- **THEN** `detectFormat` SHALL return `'openapi'` and the parser SHALL log a warning that Swagger 2.0 is not supported

#### Scenario: Detect OpenAPI 3.x YAML
- **WHEN** a `.yaml` file contains a YAML document with a top-level `openapi: "3.0.3"` key
- **THEN** `detectFormat` SHALL return `'openapi'`

#### Scenario: Detect Swagger 2.0 YAML with unquoted version
- **WHEN** a `.yml` file contains a YAML document with a top-level `swagger: 2.0` key (unquoted, parsed as a number)
- **THEN** `detectFormat` SHALL return `'openapi'` and the parser SHALL log a warning that Swagger 2.0 is not supported

#### Scenario: Other extensions default to http
- **WHEN** a file has extension `.http` or `.rest`
- **THEN** `detectFormat` SHALL return `'http'` without parsing

#### Scenario: Valid YAML without OpenAPI markers defaults to http
- **WHEN** a `.yaml` file contains valid YAML with no top-level `openapi` or `swagger` key
- **THEN** `detectFormat` SHALL return `'http'`

#### Scenario: Postman collection not misclassified as OpenAPI
- **WHEN** a `.json` file contains a Postman collection with `info.schema` containing "postman"
- **THEN** `detectFormat` SHALL return `'postman'` (OpenAPI check runs first but finds no `openapi` field)
