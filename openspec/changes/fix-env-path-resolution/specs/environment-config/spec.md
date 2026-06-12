## ADDED Requirements

### Requirement: Environment path resolution with mixed config sources
When both a global config and a project-level config are loaded, the system SHALL resolve each environment file path relative to the config directory of the source that declared the `environments` array. If the `environments` array came from the global config (because the project config does not define `environments`), paths SHALL resolve against the global config directory. If the `environments` array came from the project config (either because it defines `environments` or because no global config exists), paths SHALL resolve against the project config directory.

#### Scenario: Global environments with project config present
- **WHEN** the global config at `~/.config/httptui/config.json` contains `environments: [{ name: "LocalAPI", file: "env/local.json" }]`, a project-level `.httptui.json` exists in the `.http` file's directory but does not define `environments`, and the user runs `httptui api.http --env-name LocalAPI`
- **THEN** the system SHALL resolve `env/local.json` relative to `~/.config/httptui/` (the global config directory), producing `~/.config/httptui/env/local.json`

#### Scenario: Project environments override with project-relative paths
- **WHEN** the global config contains `environments: [{ name: "Dev", file: "env/global-dev.json" }]`, the project config contains `environments: [{ name: "Dev", file: "env/project-dev.json" }]`, and the user runs `httptui api.http --env-name Dev`
- **THEN** the system SHALL resolve `env/project-dev.json` relative to the project config directory (the directory containing `.httptui.json`), not the global config directory
