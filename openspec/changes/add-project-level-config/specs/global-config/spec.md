# Spec: Global Config (Delta)

## Purpose

Global configuration file discovery, loading, validation, and path resolution for httptui. The config file lives at a platform-appropriate location and maps hostnames to client certificate entries.

## ADDED Requirements

### Requirement: Global config loading accepts optional project directory
The `loadConfig()` function SHALL accept an optional `projectDir` parameter. When `projectDir` is provided and a `.httptui.json` file exists in that directory, `loadConfig()` SHALL load both the global config and the project config, perform a shallow merge (project wins), and return the merged result. When `projectDir` is omitted or no `.httptui.json` exists in that directory, `loadConfig()` SHALL return only the global config (or null if none exists).

#### Scenario: loadConfig with project directory performs merge
- **WHEN** `loadConfig('/project/api')` is called, global config has `certificates: {"api.example.com": {...}}`, and `/project/api/.httptui.json` has `certificates: {"api.corp.com": {...}}`
- **THEN** the returned config SHALL have `certificates: {"api.corp.com": {...}}`

#### Scenario: loadConfig without project directory returns global only
- **WHEN** `loadConfig()` is called with no arguments and global config has `certificates: {"api.example.com": {...}}`
- **THEN** the returned config SHALL have `certificates: {"api.example.com": {...}}`

#### Scenario: loadConfig with non-existent project directory returns global only
- **WHEN** `loadConfig('/project/api')` is called but `/project/api/.httptui.json` does not exist
- **THEN** the returned config SHALL be the global config (or null)

## MODIFIED Requirements

### Requirement: Path resolution for certificate files
Certificate file paths in the config (`cert`, `key`, `pfx`, `ca`) SHALL be resolved using these rules, in order:
1. If the path starts with `~`, expand `~` to `os.homedir()`.
2. If the path is already absolute, use it as-is.
3. If the path is relative, resolve it against the directory containing the config file that declared it (global config directory for global entries, project config directory for project entries).

#### Scenario: Relative path in global config resolves against global config directory
- **WHEN** global config is at `~/.config/httptui/config.json` and a `cert` value is `./certs/client.crt`
- **THEN** the resolved path SHALL be `~/.config/httptui/certs/client.crt` (expanded to absolute)

#### Scenario: Relative path in project config resolves against project config directory
- **WHEN** project config is at `/project/api/.httptui.json` and a `cert` value is `./certs/client.crt`
- **THEN** the resolved path SHALL be `/project/api/certs/client.crt`

### Requirement: Global config file discovery
httptui SHALL load a global configuration file from the first matching location in this priority order:
1. `$HTTP_TUI_CONFIG` environment variable (explicit override, must be an absolute or relative file path)
2. `$XDG_CONFIG_HOME/httptui/config.json` (XDG standard, typical on macOS/Linux)
3. `%APPDATA%\httptui\config.json` (Windows standard, when `process.platform === 'win32'`)
4. `$HOME/.config/httptui/config.json` (hardcoded fallback using `os.homedir()`)

If no config file is found, httptui SHALL proceed with a null config (as if no configuration was provided) and SHALL NOT emit any warnings or errors. The global config SHALL be loaded independently of any project config; the merge step happens after both are loaded.

#### Scenario: Missing config file is silently ignored
- **WHEN** no `config.json` exists at any of the expected locations and no project config exists
- **THEN** httptui SHALL start normally with null configuration and SHALL NOT emit any warning or error
