## ADDED Requirements

### Requirement: Global config file discovery
httptui SHALL load a global configuration file from the first matching location in this priority order:
1. `$HTTP_TUI_CONFIG` environment variable (explicit override, must be an absolute or relative file path)
2. `$XDG_CONFIG_HOME/httptui/config.json` (XDG standard, typical on macOS/Linux)
3. `%APPDATA%\httptui\config.json` (Windows standard, when `process.platform === 'win32'`)
4. `$HOME/.config/httptui/config.json` (hardcoded fallback using `os.homedir()`)

If no config file is found, httptui SHALL proceed with a null config (as if no configuration was provided) and SHALL NOT emit any warnings or errors.

#### Scenario: XDG_CONFIG_HOME is respected on Linux
- **WHEN** `XDG_CONFIG_HOME` is set to `/custom/config` and `/custom/config/httptui/config.json` exists
- **THEN** httptui SHALL load configuration from `/custom/config/httptui/config.json`

#### Scenario: APPDATA is respected on Windows
- **WHEN** `process.platform` is `'win32'` and `APPDATA` is set to `C:\Users\demo\AppData\Roaming`
- **THEN** httptui SHALL attempt to load configuration from `C:\Users\demo\AppData\Roaming\httptui\config.json`

#### Scenario: HTTP_TUI_CONFIG overrides all other locations
- **WHEN** `HTTP_TUI_CONFIG` is set to `/tmp/my-httptui.json`
- **THEN** httptui SHALL load configuration from `/tmp/my-httptui.json` regardless of XDG_CONFIG_HOME or APPDATA

#### Scenario: Fallback to ~/.config/httptui/config.json
- **WHEN** none of HTTP_TUI_CONFIG, XDG_CONFIG_HOME, or APPDATA produce a valid config path, but `$HOME/.config/httptui/config.json` exists
- **THEN** httptui SHALL load configuration from `$HOME/.config/httptui/config.json`

#### Scenario: Missing config file is silently ignored
- **WHEN** no `config.json` exists at any of the expected locations
- **THEN** httptui SHALL start normally with null configuration and SHALL NOT emit any warning or error

### Requirement: Global config file schema
The config file SHALL be a JSON file whose top-level structure is an object with an optional `certificates` field. The `certificates` field SHALL be an object mapping host key strings (of the form `hostname` or `hostname:port`) to certificate entry objects. Each certificate entry object MAY contain `cert`, `key`, `pfx`, `passphrase`, and `ca` fields, all as strings.

#### Scenario: Valid minimal config (PEM pair)
- **WHEN** config.json contains `{"certificates": {"api.example.com": {"cert": "./certs/client.crt", "key": "./certs/client.key"}}}`
- **THEN** httptui SHALL parse the config successfully and store the certificate entry for `api.example.com`

#### Scenario: Valid PFX config with env var passphrase
- **WHEN** config.json contains `{"certificates": {"api.corp": {"pfx": "./certs/corp.p12", "passphrase": "$CORP_PASS"}}}`
- **THEN** httptui SHALL parse the config successfully and associate the PFX entry with the host `api.corp`

### Requirement: Config file validation
httptui SHALL validate the loaded config file for the following structural rules:
- If `cert` is provided, `key` MUST also be provided (and vice versa).
- `cert`+`key` and `pfx` are mutually exclusive within the same entry.
- At least one of `cert`, `key`, `pfx`, or `ca` MUST be present in each entry.

Validation errors SHALL be reported to stderr as warnings during startup but SHALL NOT prevent httptui from running. Invalid entries SHALL be skipped (excluded from the certificate map). Unknown fields in entries SHALL be silently ignored.

#### Scenario: cert without key emits warning and entry is skipped
- **WHEN** a certificate entry contains `"cert": "./client.crt"` but no `"key"` field
- **THEN** httptui SHALL emit a warning to stderr naming the host and the missing field
- **AND** the entry SHALL NOT be included in the certificate map

#### Scenario: cert and pfx both present emits warning and entry is skipped
- **WHEN** a certificate entry contains both `cert`/`key` and `pfx` fields
- **THEN** httptui SHALL emit a warning to stderr stating the entry is ambiguous
- **AND** the entry SHALL NOT be included in the certificate map

#### Scenario: Empty entry emits warning and entry is skipped
- **WHEN** a certificate entry is `{}` (no cert, key, pfx, or ca fields)
- **THEN** httptui SHALL emit a warning to stderr
- **AND** the entry SHALL NOT be included in the certificate map

#### Scenario: Unknown fields are silently ignored
- **WHEN** a certificate entry contains `"note": "my dev cert"` alongside valid `cert`/`key` fields
- **THEN** httptui SHALL parse the valid fields and silently ignore the `note` field

#### Scenario: Malformed JSON emits error and httptui continues without config
- **WHEN** the config file contains invalid JSON
- **THEN** httptui SHALL emit an error to stderr describing the parse failure
- **AND** httptui SHALL continue running with null configuration (no certificates)

### Requirement: Path resolution for certificate files
Certificate file paths in the config (`cert`, `key`, `pfx`, `ca`) SHALL be resolved using these rules, in order:
1. If the path starts with `~`, expand `~` to `os.homedir()`.
2. If the path is already absolute, use it as-is.
3. If the path is relative, resolve it against the directory containing the config file.

Path resolution SHALL work on Windows and POSIX systems. Backslash and forward slash separators SHALL both be accepted.

#### Scenario: Relative path resolves against config directory
- **WHEN** config is at `~/.config/httptui/config.json` and a `cert` value is `./certs/client.crt`
- **THEN** the resolved path SHALL be `~/.config/httptui/certs/client.crt` (expanded to absolute)

#### Scenario: Tilde expands to home directory
- **WHEN** a `cert` value is `~/mycerts/client.crt`
- **THEN** the resolved path SHALL be `$HOME/mycerts/client.crt` (expanded to absolute)

#### Scenario: Absolute path is preserved
- **WHEN** a `cert` value is `/etc/ssl/client.crt`
- **THEN** the resolved path SHALL be `/etc/ssl/client.crt`

### Requirement: Passphrase resolution from environment variables
When a certificate entry's `passphrase` field starts with `$`, httptui SHALL strip the leading `$` and look up the remaining identifier as a key in `process.env`. If the variable is set, its value SHALL be used as the passphrase. If the variable is not set, the request SHALL fail with a clear error indicating the missing variable name.

If the `passphrase` field does not start with `$`, it SHALL be used as a literal string (for V1, this is permitted but discouraged — passphrases in config files are a security risk and may be disallowed in a future version).

#### Scenario: Passphrase loaded from environment variable
- **WHEN** a certificate entry has `"passphrase": "$CERT_PASS"` and `process.env.CERT_PASS` is `"s3cret"`
- **THEN** the passphrase used for the TLS connection SHALL be `"s3cret"`

#### Scenario: Missing environment variable produces clear error
- **WHEN** a certificate entry has `"passphrase": "$CERT_PASS"` and `process.env.CERT_PASS` is not set
- **THEN** the request SHALL fail with an error message: `"Environment variable CERT_PASS is not set (required for host <hostname>)"`
