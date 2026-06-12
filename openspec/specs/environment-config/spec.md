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

### Requirement: Environment path resolution with mixed config sources
When both a global config and a project-level config are loaded, the system SHALL resolve each environment file path relative to the config directory of the source that declared the `environments` array. If the `environments` array came from the global config (because the project config does not define `environments`), paths SHALL resolve against the global config directory. If the `environments` array came from the project config (either because it defines `environments` or because no global config exists), paths SHALL resolve against the project config directory.

#### Scenario: Global environments with project config present
- **WHEN** the global config at `~/.config/httptui/config.json` contains `environments: [{ name: "LocalAPI", file: "env/local.json" }]`, a project-level `.httptui.json` exists in the `.http` file's directory but does not define `environments`, and the user runs `httptui api.http --env-name LocalAPI`
- **THEN** the system SHALL resolve `env/local.json` relative to `~/.config/httptui/` (the global config directory), producing `~/.config/httptui/env/local.json`

#### Scenario: Project environments override with project-relative paths
- **WHEN** the global config contains `environments: [{ name: "Dev", file: "env/global-dev.json" }]`, the project config contains `environments: [{ name: "Dev", file: "env/project-dev.json" }]`, and the user runs `httptui api.http --env-name Dev`
- **THEN** the system SHALL resolve `env/project-dev.json` relative to the project config directory (the directory containing `.httptui.json`), not the global config directory
