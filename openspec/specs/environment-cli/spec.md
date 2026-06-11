# Spec: Environment CLI

## Purpose

Accept CLI flags for selecting and loading environment files. Validate flag combinations and provide clear error messages when the requested environment cannot be found or loaded.

## Requirements

### Requirement: Load environment via CLI flags
The system SHALL accept `--env` or `-e` as a CLI flag followed by a file path. The system SHALL also accept `--env-name` or `-E` as a CLI flag followed by an environment name. Only one of `--env` or `--env-name` can be specified at a time. If the file does not exist, cannot be parsed, or the name cannot be resolved, the system SHALL exit with an error message.

#### Scenario: Load environment with --env flag
- **WHEN** the user runs `httptui collection.json --env dev.json`
- **THEN** the system SHALL load the environment file and merge its variables with the collection variables

#### Scenario: Load environment with --env-name flag
- **WHEN** the user runs `httptui collection.json --env-name Development`
- **THEN** the system SHALL look up the environment name in the loaded config, resolve the file path, and load the environment variables

#### Scenario: Load environment by name using short flag
- **WHEN** the user runs `httptui api.http -E Development`
- **THEN** the system SHALL behave identically to `--env-name Development`

#### Scenario: Missing environment file
- **WHEN** the user runs `httptui collection.json --env missing.json`
- **THEN** the system SHALL exit with an error: `Environment file not found: missing.json`

#### Scenario: Invalid environment file
- **WHEN** the user runs `httptui collection.json --env bad.json` where `bad.json` is not valid environment JSON
- **THEN** the system SHALL exit with an error indicating the file could not be parsed

#### Scenario: Environment name not found
- **WHEN** the user runs `httptui collection.json --env-name NonExistent`
- **THEN** the system SHALL exit with an error: `Environment not found in config: NonExistent`

#### Scenario: Missing environment file for name
- **WHEN** the user runs `httptui api.http --env-name Development` but the resolved file path does not exist
- **THEN** the system SHALL exit with an error: `Environment file not found: <resolved_path>`

#### Scenario: Mutually exclusive env flags
- **WHEN** the user runs `httptui collection.json --env dev.json --env-name Development`
- **THEN** the system SHALL exit with an error indicating that only one of `--env` and `--env-name` can be specified

#### Scenario: --env-name without value
- **WHEN** the user runs `httptui api.http --env-name`
- **THEN** the system SHALL exit with an error indicating that `--env-name` requires a value

#### Scenario: --env-name with another flag as value
- **WHEN** the user runs `httptui api.http --env-name --insecure`
- **THEN** the system SHALL exit with an error indicating that `--env-name` requires a value
