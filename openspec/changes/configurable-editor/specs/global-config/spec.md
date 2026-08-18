## ADDED Requirements

### Requirement: Editor command field

The config file — global `config.json` and project `.httptui.json`, which is validated with the same schema — SHALL accept an optional top-level `editor` field naming the external editor command for the `Ctrl+G` handoff. The value SHALL be a single string carrying the executable and its arguments, with the same semantics as the `EDITOR` environment variable: it is split on whitespace when launched, and paths containing spaces are not representable. The field SHALL NOT affect any other config section.

A value that is empty or whitespace-only SHALL be treated as unset, and no message SHALL be emitted for it. A value of any other type than string SHALL emit an error to stderr naming the `editor` field, SHALL be treated as unset, and the remaining config fields SHALL still load normally.

A leading `~` in the value SHALL expand to the user's home directory before the value is used. The value is a command, not a config-relative file path: relative executables SHALL NOT be resolved against the config directory; they resolve against the working directory at launch time like any other command.

#### Scenario: A valid editor with arguments is loaded

- **WHEN** config.json contains `{"editor": "code --wait"}`
- **THEN** httptui SHALL load the config successfully with the `editor` value `"code --wait"` exposed as the active editor command

#### Scenario: A leading tilde expands to the home directory

- **WHEN** config.json contains `{"editor": "~/bin/my-editor --wait"}`
- **THEN** the active editor command SHALL begin with the user's home directory path followed by `/bin/my-editor --wait`

#### Scenario: An empty or whitespace-only value is treated as unset silently

- **WHEN** config.json contains `{"editor": "   "}` and valid `certificates`
- **THEN** no warning or error SHALL be emitted for the `editor` field
- **AND** the config SHALL load with no editor value set and the certificates intact

#### Scenario: A non-string value emits an error and is ignored

- **WHEN** config.json contains `{"editor": 3, "certificates": {...}}`
- **THEN** httptui SHALL emit an error to stderr naming the `editor` field
- **AND** the `editor` field SHALL be treated as unset while the `certificates` still load

#### Scenario: A relative editor value is not resolved against the config directory

- **WHEN** global config at `~/.config/httptui/config.json` contains `{"editor": "./bin/my-editor"}`
- **THEN** the active editor command SHALL be the literal `./bin/my-editor`, resolved against the working directory at launch, not against `~/.config/httptui/`
