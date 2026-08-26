# Spec: CLI Version

## Purpose

Lets users print the installed httptui version from the command line, so installs can be identified in bug reports and shell scripts without inspecting package files.

## Requirements

### Requirement: Version flag recognition
The CLI SHALL recognize `-v` and `--version` as boolean flags in the command-line arguments. When either flag is present, the system SHALL print the released version string to stdout and exit with code 0, without launching the TUI and without requiring a file argument.

#### Scenario: Long flag without a file
- **WHEN** the CLI is invoked with `httptui --version` and no file argument
- **THEN** the released version string SHALL be printed to stdout and the process SHALL exit with code 0

#### Scenario: Short flag without a file
- **WHEN** the CLI is invoked with `httptui -v` and no file argument
- **THEN** the released version string SHALL be printed to stdout and the process SHALL exit with code 0

#### Scenario: Version flag takes precedence over a file argument
- **WHEN** the CLI is invoked with `httptui -v path/to/api.http`
- **THEN** the released version string SHALL be printed to stdout, the process SHALL exit with code 0, and the TUI SHALL NOT launch

### Requirement: Version output format
The version output SHALL be the bare version string (for example `0.7.0`) exactly as declared in the project's `package.json`, followed by a newline. The output SHALL go to stdout, distinguishing it from error output, which goes to stderr with a non-zero exit code.

#### Scenario: Output matches package.json version
- **WHEN** the CLI is invoked with `httptui --version` and `package.json` declares `"version": "0.7.0"`
- **THEN** stdout SHALL contain exactly `0.7.0` and the exit code SHALL be 0

#### Scenario: Version check precedes usage validation
- **WHEN** the CLI is invoked with `httptui --version` and no file argument
- **THEN** the version SHALL be printed instead of the missing-file usage error, and the exit code SHALL be 0

### Requirement: Version single source of truth
The printed version string SHALL come from the project's `package.json` via a static JSON import, so `package.json` remains the single source of truth. The version SHALL be inlined into the distributed bundle at build time.

#### Scenario: Version survives bundling
- **WHEN** the CLI is built into `dist/cli.js` and invoked with `httptui --version`
- **THEN** the printed version SHALL match the `version` field of the `package.json` used for that build
