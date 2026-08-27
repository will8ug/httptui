## MODIFIED Requirements

### Requirement: Version flag recognition
The CLI SHALL recognize `-v` and `--version` as boolean flags in the command-line arguments. When either flag is present and no help flag (`-h`/`--help`) is also present, the system SHALL print the released version string to stdout and exit with code 0, without launching the TUI and without requiring a file argument. When both a version flag and a help flag are present, the help behavior specified by the `cli-help` capability SHALL take precedence.

#### Scenario: Long flag without a file
- **WHEN** the CLI is invoked with `httptui --version` and no file argument
- **THEN** the released version string SHALL be printed to stdout and the process SHALL exit with code 0

#### Scenario: Short flag without a file
- **WHEN** the CLI is invoked with `httptui -v` and no file argument
- **THEN** the released version string SHALL be printed to stdout and the process SHALL exit with code 0

#### Scenario: Version flag takes precedence over a file argument
- **WHEN** the CLI is invoked with `httptui -v path/to/api.http`
- **THEN** the released version string SHALL be printed to stdout, the process SHALL exit with code 0, and the TUI SHALL NOT launch
