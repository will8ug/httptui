# Spec: Environment Name CLI

## Purpose

Accept `--env-name` or `-E` as a CLI flag to select an environment by name from the loaded config file.

## Requirements

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

#### Scenario: --env-name without value
- **WHEN** the user runs `httptui api.http --env-name`
- **THEN** the system SHALL exit with an error indicating that `--env-name` requires a value

#### Scenario: --env-name with another flag as value
- **WHEN** the user runs `httptui api.http --env-name --insecure`
- **THEN** the system SHALL exit with an error indicating that `--env-name` requires a value