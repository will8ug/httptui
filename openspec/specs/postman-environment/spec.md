# Spec: Postman Environment Files

## Purpose

Load and apply Postman environment files (`.postman_environment.json`) to override file-level and collection-level variables. Enables running the same collection or `.http` file against different environments (dev, staging, prod) without editing the source.

## Requirements

### Requirement: Parse Postman environment files
The system SHALL parse `.postman_environment.json` files and extract enabled variables into the internal `FileVariable[]` format. The parser SHALL skip entries where `enabled` is `false`. The parser SHALL ignore the `type` field (no secret masking).

#### Scenario: Parse a basic environment file
- **WHEN** a `.postman_environment.json` contains `name: "Dev"` and `values: [{ key: "baseUrl", value: "https://api.dev.com", enabled: true }]`
- **THEN** the parser SHALL return a `FileVariable` with `name: "baseUrl"` and `value: "https://api.dev.com"`

#### Scenario: Skip disabled variables
- **WHEN** a `.postman_environment.json` contains a variable with `enabled: false`
- **THEN** the parser SHALL NOT include that variable in the result

#### Scenario: Handle empty values array
- **WHEN** a `.postman_environment.json` has no `values` array
- **THEN** the parser SHALL return an empty `FileVariable[]` array

### Requirement: Load environment via CLI flag
The system SHALL accept `--env` or `-e` as a CLI flag followed by a file path. If the file does not exist or cannot be parsed, the system SHALL exit with an error message.

#### Scenario: Load environment with --env flag
- **WHEN** the user runs `httptui collection.json --env dev.postman_environment.json`
- **THEN** the system SHALL load the environment file and merge its variables with the collection variables

#### Scenario: Missing environment file
- **WHEN** the user runs `httptui collection.json --env missing.json`
- **THEN** the system SHALL exit with an error: `Environment file not found: missing.json`

#### Scenario: Invalid environment file
- **WHEN** the user runs `httptui collection.json --env bad.json` where `bad.json` is not valid Postman environment JSON
- **THEN** the system SHALL exit with an error indicating the file could not be parsed

### Requirement: Environment variables take precedence
When an environment file is loaded, environment variables SHALL override file/collection variables of the same name during resolution. System variables (`{{$timestamp}}`, `{{$processEnv}}`, etc.) SHALL still be resolved in the second pass.

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
When the user reloads the current file (`R`) or loads a different file (`o`), the system SHALL re-apply the environment variables to the newly parsed variables.

#### Scenario: Reload preserves environment
- **WHEN** a user has loaded a collection with `--env dev.json`, then presses `R` to reload
- **THEN** the reloaded collection variables SHALL still be overridden by `dev.json` values

#### Scenario: File load preserves environment
- **WHEN** a user has loaded a collection with `--env dev.json`, then presses `o` and loads a different collection
- **THEN** the new collection variables SHALL be overridden by `dev.json` values

#### Scenario: Environment variables are available in request details
- **WHEN** a user views request details (presses `d`) after loading with `--env`
- **THEN** the resolved request details SHALL reflect environment variable values, not file/collection defaults
