# Spec: Environment Files

## Purpose

Load and apply environment files (Postman `.postman_environment.json` and simplified format) to override file-level and collection-level variables. Enables running the same collection or `.http` file against different environments (dev, staging, prod) without editing the source.

## Requirements

### Requirement: Parse environment files
The system SHALL parse both Postman environment files (`.postman_environment.json`) and simplified environment files. The parser SHALL skip entries where `enabled` is `false`. The parser SHALL ignore the `type` field and other Postman-specific metadata.

#### Scenario: Parse a basic environment file
- **WHEN** an environment file contains `name: "Dev"` and `values: [{ key: "baseUrl", value: "https://api.dev.com", enabled: true }]`, and the file is loaded via `--env`
- **THEN** the parser SHALL return a `FileVariable` with `name: "baseUrl"` and `value: "https://api.dev.com"`

#### Scenario: Skip disabled variables
- **WHEN** an environment file contains a variable with `enabled: false`
- **THEN** the parser SHALL NOT include that variable in the result

#### Scenario: Handle empty values array
- **WHEN** an environment file has no `values` array
- **THEN** the parser SHALL return an empty `FileVariable[]` array

#### Scenario: Parse simplified environment file with omitted enabled field
- **WHEN** a simplified environment file contains `values: [{ key: "baseUrl", value: "https://api.dev.com" }]` without an `enabled` field
- **THEN** the parser SHALL treat the variable as enabled and return a `FileVariable` with `name: "baseUrl"` and `value: "https://api.dev.com"`

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

#### Scenario: Parse invalid environment file
- **WHEN** an environment file is not valid JSON
- **THEN** the parser SHALL throw an error indicating the file could not be parsed

#### Scenario: Parse non-object environment file
- **WHEN** an environment file is a JSON array instead of an object
- **THEN** the parser SHALL throw an error indicating the file could not be parsed

### Requirement: Environment variables take precedence
When an environment file is loaded via `--env` or `--env-name`, environment variables SHALL override file/collection variables of the same name during resolution. System variables (`{{$timestamp}}`, `{{$processEnv}}`, etc.) SHALL still be resolved in the second pass.

#### Scenario: Environment overrides collection variable
- **WHEN** a Postman collection defines `baseUrl = "https://api.example.com"` and the environment file defines `baseUrl = "https://api.staging.com"`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `"https://api.staging.com"`

#### Scenario: Environment overrides .http file variable
- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and the environment file defines `baseUrl = "https://api.dev.com"`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `"https://api.dev.com"`

#### Scenario: Environment variable does not affect system variables
- **WHEN** an environment file has no variable named `timestamp` and a request contains `{{$timestamp}}`
- **THEN** the system variable SHALL still resolve to the current Unix timestamp

### Requirement: Preserve environment on reload and file load
When the user reloads the current file (`R`) or loads a different file (`o`), the system SHALL re-apply the environment variables to the newly parsed variables. This applies to both `--env` and `--env-name`.

#### Scenario: Reload preserves environment
- **WHEN** a user has loaded a collection with `--env dev.json`, then presses `R` to reload
- **THEN** the reloaded collection variables SHALL still be overridden by `dev.json` values

#### Scenario: Reload preserves environment selected by name
- **WHEN** a user has loaded a collection with `--env-name Development`, then presses `R` to reload
- **THEN** the system SHALL re-look up the environment name in the loaded config, re-resolve the file path, and re-apply the environment variables

#### Scenario: File load preserves environment
- **WHEN** a user has loaded a collection with `--env dev.json`, then presses `o` and loads a different collection
- **THEN** the new collection variables SHALL be overridden by `dev.json` values

#### Scenario: File load preserves environment selected by name
- **WHEN** a user has loaded a collection with `--env-name Development`, then presses `o` and loads a different collection
- **THEN** the system SHALL re-look up the environment name in the loaded config, re-resolve the file path, and re-apply the environment variables

#### Scenario: Environment variables are available in request details
- **WHEN** a user views request details (presses `d`) after loading with `--env` or `--env-name`
- **THEN** the resolved request details SHALL reflect environment variable values, not file/collection defaults
