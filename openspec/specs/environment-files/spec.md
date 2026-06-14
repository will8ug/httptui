# Spec: Environment Files

## Purpose

Load and apply environment files (Postman `.postman_environment.json` and simplified format) as a base layer of variables. File-level and collection-level variables take precedence over environment file variables, enabling environment files to provide defaults while allowing per-file or per-request overrides.

## Requirements

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

### Requirement: File variables take precedence over environment variables
When an environment file is loaded via `--env` or `--env-name`, file variables and collection variables SHALL take precedence over environment file variables of the same name during resolution. Environment file variables SHALL serve as a base layer providing defaults. System variables (`{{$timestamp}}`, `{{$processEnv}}`, etc.) SHALL still be resolved in the second pass.

#### Scenario: File variable overrides environment variable
- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and the environment file defines `baseUrl = "https://api.dev.com"`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `https://api.local` (file value wins)

#### Scenario: Collection variable overrides environment variable
- **WHEN** a Postman collection defines `baseUrl = "https://api.example.com"` and the environment file defines `baseUrl = "https://api.staging.com"`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `"https://api.example.com"` (collection value wins)

#### Scenario: Environment variable used as default when no file variable exists
- **WHEN** an environment file defines `apiKey = "dev-key-123"` and no file or collection variable named `apiKey` exists
- **THEN** requests containing `{{apiKey}}` SHALL resolve to `"dev-key-123"` (environment value serves as base)

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
