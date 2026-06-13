## MODIFIED Requirements

### Requirement: Parse environment files
The system SHALL parse both Postman environment files (`.postman_environment.json`) and simplified environment files. The parser SHALL skip entries where `enabled` is `false`. The parser SHALL ignore the `type` field and other Postman-specific metadata. The parser SHALL return an object `{ name: string | null; variables: FileVariable[] }`, where `name` is the file's top-level `name` field when it is a non-empty string and `null` otherwise, and `variables` is the parsed list of enabled variables.

#### Scenario: Parse a basic environment file
- **WHEN** an environment file contains `name: "Dev"` and `values: [{ key: "baseUrl", value: "https://api.dev.com", enabled: true }]`, and the file is loaded via `--env`
- **THEN** the parser SHALL return `name: "Dev"` and a `variables` array containing a `FileVariable` with `name: "baseUrl"` and `value: "https://api.dev.com"`

#### Scenario: Return top-level name when present
- **WHEN** an environment file contains a non-empty top-level `name` field
- **THEN** the parser SHALL return that string as `name`

#### Scenario: Return null name when absent or empty
- **WHEN** an environment file has no top-level `name` field, or its `name` is an empty string or not a string
- **THEN** the parser SHALL return `name: null`

#### Scenario: Skip disabled variables
- **WHEN** an environment file contains a variable with `enabled: false`
- **THEN** the parser SHALL NOT include that variable in the `variables` result

#### Scenario: Handle empty values array
- **WHEN** an environment file has no `values` array
- **THEN** the parser SHALL return an empty `variables` array

#### Scenario: Parse simplified environment file with omitted enabled field
- **WHEN** a simplified environment file contains `values: [{ key: "baseUrl", value: "https://api.dev.com" }]` without an `enabled` field
- **THEN** the parser SHALL treat the variable as enabled and return a `FileVariable` with `name: "baseUrl"` and `value: "https://api.dev.com"` in the `variables` array

#### Scenario: Parse simplified environment file with missing values
- **WHEN** a simplified environment file contains `name: "Empty"` without a `values` array
- **THEN** the parser SHALL return `name: "Empty"` and an empty `variables` array

#### Scenario: Parse simplified environment file with empty values
- **WHEN** a simplified environment file contains `name: "Empty"` and `values: []`
- **THEN** the parser SHALL return `name: "Empty"` and an empty `variables` array

#### Scenario: Parse simplified environment file with mixed values
- **WHEN** a simplified environment file contains `values: [{ key: "valid", value: "yes" }, { value: "no key" }, { key: "", value: "empty key" }]`
- **THEN** the `variables` array SHALL contain only the `valid` variable with `value: "yes"`

#### Scenario: Parse simplified environment file with non-string values
- **WHEN** a simplified environment file contains `values: [{ key: "number", value: 42 }, { key: "bool", value: true }, { key: "null", value: null }]`
- **THEN** the `variables` array SHALL contain `number: "42"`, `bool: "true"`, and `null: ""`

#### Scenario: Parse invalid environment file
- **WHEN** an environment file is not valid JSON
- **THEN** the parser SHALL throw an error indicating the file could not be parsed

#### Scenario: Parse non-object environment file
- **WHEN** an environment file is a JSON array instead of an object
- **THEN** the parser SHALL throw an error indicating the file could not be parsed
