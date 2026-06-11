# Spec: Environment Configuration

## Purpose

Register environment files in the global config or project-level config under an `environments` array with `name` and `file` fields. Resolve file paths relative to the config directory, and merge with shallow-replace semantics.

## Requirements

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

#### Scenario: Absolute path in environment file
- **WHEN** the config contains `environments: [{ name: "Production", file: "/etc/httptui/env/prod.json" }]`
- **THEN** the system SHALL use the absolute path as-is without resolving it relative to the config directory

#### Scenario: Environment name resolution
- **WHEN** the config contains `environments: [{ name: "Development", file: "env/dev.json" }]` and the user specifies `--env-name Development`
- **THEN** the system SHALL find the matching environment by name and resolve its file path
