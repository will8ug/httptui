## ADDED Requirements

### Requirement: Simplified environment file format
The system SHALL support a simplified environment file format that is compatible with the Postman environment file format but does not require Postman-specific metadata fields.

#### Scenario: Parse simplified environment file
- **WHEN** a simplified environment file contains `name: "Development"` and `values: [{ key: "baseUrl", value: "https://api.dev.com", enabled: true }]`, and the file is loaded via `--env`
- **THEN** the parser SHALL return a `FileVariable` with `name: "baseUrl"` and `value: "https://api.dev.com"`

#### Scenario: Parse simplified environment file with omitted enabled field
- **WHEN** a simplified environment file contains `values: [{ key: "baseUrl", value: "https://api.dev.com" }]` without an `enabled` field
- **THEN** the parser SHALL treat the variable as enabled and return a `FileVariable` with `name: "baseUrl"` and `value: "https://api.dev.com"`

#### Scenario: Parse simplified environment file with disabled variable
- **WHEN** a simplified environment file contains `values: [{ key: "apiKey", value: "dev-secret-key", enabled: false }]`
- **THEN** the parser SHALL skip the disabled variable and return an empty `FileVariable[]` array

#### Scenario: Parse simplified environment file with missing values
- **WHEN** a simplified environment file contains `name: "Empty"` without a `values` array
- **THEN** the parser SHALL return an empty `FileVariable[]` array

#### Scenario: Parse simplified environment file with empty values
- **WHEN** a simplified environment file contains `name: "Empty"` and `values: []`
- **THEN** the parser SHALL return an empty `FileVariable[]` array

#### Scenario: Parse simplified environment file with mixed values
- **WHEN** a simplified environment file contains `values: [{ key: "valid", value: "yes" }, { value: "no key" }, { key: "", value: "empty key" }]`
- **THEN** the parser SHALL return only the `valid` variable with `value: "yes"`

#### Scenario: Parse simplified environment file with non-string values
- **WHEN** a simplified environment file contains `values: [{ key: "number", value: 42 }, { key: "bool", value: true }, { key: "null", value: null }]`
- **THEN** the parser SHALL return `number: "42"`, `bool: "true"`, and `null: ""`

#### Scenario: Parse invalid simplified environment file
- **WHEN** a simplified environment file is not valid JSON
- **THEN** the parser SHALL throw an error indicating the file could not be parsed

#### Scenario: Parse non-object simplified environment file
- **WHEN** a simplified environment file is a JSON array instead of an object
- **THEN** the parser SHALL throw an error indicating the file could not be parsed
