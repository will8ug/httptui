# Spec: CLI Help

## Purpose

Lets users discover httptui's command-line options without leaving the terminal, printing usage information on demand and pointing no-file usage errors at the help flag.

## Requirements

### Requirement: Help flag recognition
The CLI SHALL recognize `-h` and `--help` as boolean flags in the command-line arguments. When either flag is present, the system SHALL print the help text to stdout and exit with code 0, without launching the TUI and without requiring a file argument.

#### Scenario: Long flag without a file
- **WHEN** the CLI is invoked with `httptui --help` and no file argument
- **THEN** the help text SHALL be printed to stdout and the process SHALL exit with code 0

#### Scenario: Short flag without a file
- **WHEN** the CLI is invoked with `httptui -h` and no file argument
- **THEN** the help text SHALL be printed to stdout and the process SHALL exit with code 0

#### Scenario: Help flag takes precedence over a file argument
- **WHEN** the CLI is invoked with `httptui -h path/to/api.http`
- **THEN** the help text SHALL be printed to stdout, the process SHALL exit with code 0, and the TUI SHALL NOT launch

#### Scenario: Help flag recognized alongside value-taking flags
- **WHEN** the CLI is invoked with `httptui --env -h` and no file argument
- **THEN** the help text SHALL be printed to stdout and the process SHALL exit with code 0, and `-h` SHALL NOT be consumed as the value of `--env`

### Requirement: Help takes precedence over version
When both a help flag and a version flag are present in the command-line arguments, the system SHALL print the help text and exit with code 0. The version string SHALL NOT be printed.

#### Scenario: Help flag before version flag
- **WHEN** the CLI is invoked with `httptui -h -v`
- **THEN** the help text SHALL be printed to stdout, the version string SHALL NOT be printed, and the process SHALL exit with code 0

#### Scenario: Version flag before help flag
- **WHEN** the CLI is invoked with `httptui --version --help`
- **THEN** the help text SHALL be printed to stdout, the version string SHALL NOT be printed, and the process SHALL exit with code 0

### Requirement: Help output content
The help text SHALL contain a usage line showing the command syntax with a file argument, one entry per supported option flag pair — `--help`/`-h`, `--version`/`-v`, `--insecure`/`-k`, `--env`/`-e`, `--env-name`/`-E` — each with a short description, and a hint that pressing `?` inside the TUI shows keyboard shortcuts. The output SHALL go to stdout, distinguishing it from error output, which goes to stderr with a non-zero exit code.

#### Scenario: Output includes usage, all flag pairs, and shortcuts hint
- **WHEN** the CLI is invoked with `httptui --help`
- **THEN** stdout SHALL contain a usage line with the command syntax, all five flag pairs with their descriptions, and a `?` hint referring to keyboard shortcuts inside the TUI, and the exit code SHALL be 0

### Requirement: Usage error directs to help
When the CLI is invoked without a file argument and without an early-exit flag, the system SHALL print an error message to stderr that includes the text `Try 'httptui --help' for more information.` and exit with a non-zero code. The TUI SHALL NOT launch.

#### Scenario: No arguments
- **WHEN** the CLI is invoked with no arguments
- **THEN** stderr SHALL contain `Try 'httptui --help' for more information.` and the process SHALL exit with a non-zero code

#### Scenario: Non-exiting flag without a file
- **WHEN** the CLI is invoked with `httptui -k` and no file argument
- **THEN** stderr SHALL contain `Try 'httptui --help' for more information.` and the process SHALL exit with a non-zero code
