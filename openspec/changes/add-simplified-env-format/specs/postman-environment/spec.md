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

### Requirement: Environment file configuration in config
The system SHALL allow environment files to be registered in the global config (`~/.config/httptui/config.json`) or project-level config (`.httptui.json`) under an `environments` array with `name` and `file` fields.

#### Scenario: Global config with environments
- **WHEN** the global config file contains `environments: [{ name: "Development", file: "env/dev.json" }]`, and the user runs `httptui api.http --env-name Development`
- **THEN** the system SHALL resolve the environment file path relative to the global config directory and load the environment variables

#### Scenario: Project config with environments
- **WHEN** the project-level `.httptui.json` contains `environments: [{ name: "Staging", file: "env/staging.json" }]`, and the user runs `httptui api.http --env-name Staging`
- **THEN** the system SHALL resolve the environment file path relative to the project config directory and load the environment variables

#### Scenario: Shallow-replace environments merge
- **WHEN** both global config and project-level config define `environments`
- **THEN** the project-level config's `environments` array SHALL replace the global config's `environments` array entirely

### Requirement: Environment selection by name via CLI
The system SHALL accept `--env-name` or `-E` as a CLI flag followed by an environment name. The system SHALL resolve the environment name to a file path using the loaded config file. If the name is not found or the file cannot be parsed, the system SHALL exit with an error.

#### Scenario: Load environment by name
- **WHEN** the user runs `httptui api.http --env-name Development`
- **THEN** the system SHALL look up the environment name in the loaded config, resolve the file path, and load the environment variables

#### Scenario: Load environment by name using short flag
- **WHEN** the user runs `httptui api.http -E Development`
- **THEN** the system SHALL behave identically to `--env-name Development`

#### Scenario: Mutually exclusive env flags
- **WHEN** the user runs `httptui api.http --env dev.json --env-name Development`
- **THEN** the system SHALL exit with an error indicating that only one of `--env` and `--env-name` can be specified

#### Scenario: Environment name not found
- **WHEN** the user runs `httptui api.http --env-name NonExistent`
- **THEN** the system SHALL exit with an error: `Environment not found in config: NonExistent`

#### Scenario: Missing environment file for name
- **WHEN** the user runs `httptui api.http --env-name Development` but the resolved file path does not exist
- **THEN** the system SHALL exit with an error: `Environment file not found: <resolved_path>`

## MODIFIED Requirements

### Requirement: Parse Postman environment files
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

#### Scenario: Parse simplified environment file
- **WHEN** a simplified environment file contains `name: "Development"` and `values: [{ key: "baseUrl", value: "https://api.dev.com", enabled: true }]`, and the file is loaded via `--env`
- **THEN** the parser SHALL return a `FileVariable` with `name: "baseUrl"` and `value: "https://api.dev.com"`

#### Scenario: Parse simplified environment file with omitted enabled field
- **WHEN** a simplified environment file contains `values: [{ key: "baseUrl", value: "https://api.dev.com" }]` without an `enabled` field
- **THEN** the parser SHALL treat the variable as enabled and return a `FileVariable` with `name: "baseUrl"` and `value: "https://api.dev.com"`

#### Scenario: Parse simplified environment file with disabled variable
- **WHEN** a simplified environment file contains `values: [{ key: "apiKey", value: "dev-secret-key", enabled: false }]`
- **THEN** the parser SHALL skip the disabled variable and return an empty `FileVariable[]` array

### Requirement: Load environment via CLI flag
The system SHALL accept `--env` or `-e` as a CLI flag followed by a file path. The system SHALL also accept `--env-name` or `-E` as a CLI flag followed by an environment name. Only one of `--env` or `--env-name` can be specified at a time. If the file does not exist or cannot be parsed, the system SHALL exit with an error message.

#### Scenario: Load environment with --env flag
- **WHEN** the user runs `httptui collection.json --env dev.json`
- **THEN** the system SHALL load the environment file and merge its variables with the collection variables

#### Scenario: Load environment with --env-name flag
- **WHEN** the user runs `httptui collection.json --env-name Development`
- **THEN** the system SHALL look up the environment name in the loaded config, resolve the file path, and load the environment variables

#### Scenario: Missing environment file
- **WHEN** the user runs `httptui collection.json --env missing.json`
- **THEN** the system SHALL exit with an error: `Environment file not found: missing.json`

#### Scenario: Invalid environment file
- **WHEN** the user runs `httptui collection.json --env bad.json` where `bad.json` is not valid environment JSON
- **THEN** the system SHALL exit with an error indicating the file could not be parsed

#### Scenario: Environment name not found
- **WHEN** the user runs `httptui collection.json --env-name NonExistent`
- **THEN** the system SHALL exit with an error: `Environment not found in config: NonExistent`

#### Scenario: Mutually exclusive env flags
- **WHEN** the user runs `httptui collection.json --env dev.json --env-name Development`
- **THEN** the system SHALL exit with an error indicating that only one of `--env` and `--env-name` can be specified

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
