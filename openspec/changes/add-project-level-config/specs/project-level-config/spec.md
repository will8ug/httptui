# Spec: Project-Level Config

## Purpose

Sidecar `.httptui.json` discovery in the `.http` file's directory, shallow merge with global config (project wins), and correct path resolution for project-local certificate and environment files.

## Requirements

### Requirement: Project config file discovery
httptui SHALL discover a project-level configuration file named `.httptui.json` in the same directory as the `.http` file being loaded. If the file exists, it SHALL be loaded and validated with the same schema rules as the global config file. If the file does not exist, httptui SHALL proceed using only the global config.

#### Scenario: Project config found next to .http file
- **WHEN** a `.http` file at `/project/api/requests.http` is loaded and `/project/api/.httptui.json` exists
- **THEN** httptui SHALL load the project config from `/project/api/.httptui.json`

#### Scenario: No project config falls back to global only
- **WHEN** a `.http` file at `/project/api/requests.http` is loaded and `/project/api/.httptui.json` does not exist
- **THEN** httptui SHALL proceed with only the global config (or null if no global config exists)

### Requirement: Shallow merge with global config
When both a project config and a global config are present, httptui SHALL perform a shallow merge: for each top-level key in the config object, the project config value SHALL take precedence over the global config value. If a top-level key exists only in the global config, it SHALL be retained. If a top-level key exists only in the project config, it SHALL be added. The merged result SHALL be the active configuration for the current session.

#### Scenario: Project overrides global certificates
- **WHEN** global config has `certificates: {"api.example.com": {...}}` and project config has `certificates: {"api.corp.com": {...}}`
- **THEN** the active config SHALL have `certificates: {"api.corp.com": {...}}` (project certs completely replace global certs)

#### Scenario: Project config adds new keys while global provides defaults
- **WHEN** global config has `certificates: {"api.example.com": {...}}` and project config has `certificates: {"api.corp.com": {...}}`
- **THEN** the active config SHALL use only the project certificates for the session

#### Scenario: Only global config exists
- **WHEN** no project config exists but global config has `certificates: {"api.example.com": {...}}`
- **THEN** the active config SHALL use the global certificates

#### Scenario: Only project config exists
- **WHEN** a project config exists with `certificates: {"api.corp.com": {...}}` and no global config exists
- **THEN** the active config SHALL use only the project certificates

### Requirement: Path resolution for project config
Certificate file paths (`cert`, `key`, `pfx`, `ca`) referenced in the project config SHALL be resolved using these rules, in order:
1. If the path starts with `~`, expand `~` to `os.homedir()`.
2. If the path is already absolute, use it as-is.
3. If the path is relative, resolve it against the directory containing the `.httptui.json` project config file.

This is distinct from global config path resolution, which resolves relative paths against the global config directory (`~/.config/httptui/`).

#### Scenario: Relative cert path resolves against project config directory
- **WHEN** project config is at `/project/api/.httptui.json` and a `cert` value is `./certs/client.crt`
- **THEN** the resolved path SHALL be `/project/api/certs/client.crt`

#### Scenario: Absolute path in project config is preserved
- **WHEN** a project config `cert` value is `/etc/ssl/client.crt`
- **THEN** the resolved path SHALL be `/etc/ssl/client.crt`

#### Scenario: Tilde path in project config expands to home
- **WHEN** a project config `cert` value is `~/certs/client.crt`
- **THEN** the resolved path SHALL be `$HOME/certs/client.crt`

### Requirement: Runtime config re-discovery
When the user switches to a different `.http` file at runtime (via the `LOAD_FILE` action), httptui SHALL re-run config discovery for the new file's directory. The previous merged config SHALL be discarded and replaced with the newly discovered and merged config.

#### Scenario: Switching files loads new project config
- **WHEN** the user opens `/project/api/requests.http` (which has `/project/api/.httptui.json`) and then switches to `/other/service/requests.http` (which has `/other/service/.httptui.json`)
- **THEN** after the switch, httptui SHALL use the config from `/other/service/.httptui.json` merged with global config

#### Scenario: Switching to file without project config drops project overrides
- **WHEN** the user is viewing a file with a project config, then switches to a file in a directory without `.httptui.json`
- **THEN** httptui SHALL fall back to global-only config for the new file
