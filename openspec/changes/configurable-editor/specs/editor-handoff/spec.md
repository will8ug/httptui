## MODIFIED Requirements

### Requirement: Editor command resolution

The system SHALL resolve the editor command from the `editor` field of the active configuration — the global config merged with any project config, as defined in the **global-config** and **project-level-config** specs — falling back to the `VISUAL` environment variable, falling back to the `EDITOR` environment variable, falling back to a platform default editor when none is set. An `editor` value that config validation ignored (empty, whitespace-only, or non-string) SHALL NOT count as set, and resolution SHALL proceed to the environment variables as if the field were absent.

The resolved value SHALL be split on whitespace into an executable and its arguments, and the executable SHALL be launched with those arguments followed by the source file path. An editor configured with a wait flag — for example `"editor": "code --wait"` — SHALL therefore receive the flag, because GUI editors only block until closed when given one.

#### Scenario: A configured editor takes precedence over the environment

- **WHEN** the active config has `editor` set to `"code --wait"`, and both `VISUAL` and `EDITOR` are set to other commands, and the user begins a handoff
- **THEN** the `code` executable SHALL be launched with `--wait` and the source file path

#### Scenario: An ignored editor value falls back to the environment

- **WHEN** the config file contains `"editor": ""` (ignored by validation), `VISUAL` is unset, and `EDITOR` is set to `vim`
- **THEN** the command named by `EDITOR` SHALL be launched

#### Scenario: A project config editor overrides a global config editor

- **WHEN** the global config has `editor` set to `vim` and the project `.httptui.json` next to the loaded file has `editor` set to `code --wait`
- **THEN** the handoff SHALL launch the project config's editor

#### Scenario: VISUAL takes precedence over EDITOR

- **WHEN** both `VISUAL` and `EDITOR` are set, no config `editor` is set, and the user begins a handoff
- **THEN** the command named by `VISUAL` SHALL be launched

#### Scenario: EDITOR is used when VISUAL is unset

- **WHEN** `VISUAL` is unset, `EDITOR` is set, and no config `editor` is set
- **THEN** the command named by `EDITOR` SHALL be launched

#### Scenario: An editor value with arguments is split

- **WHEN** `EDITOR` is set to `code --wait` and the user begins a handoff
- **THEN** the `code` executable SHALL be launched with `--wait` and the source file path as its arguments, in that order

#### Scenario: A default editor is used when neither variable is set

- **WHEN** no config `editor` is set and neither `VISUAL` nor `EDITOR` is set and the user begins a handoff
- **THEN** a platform default editor SHALL be launched
