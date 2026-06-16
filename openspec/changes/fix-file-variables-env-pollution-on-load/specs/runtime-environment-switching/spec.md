## MODIFIED Requirements

### Requirement: Pristine file-variable base preserved across reload and file load
The system SHALL maintain the pristine file-level variables (before any environment merge) in application state. When the user reloads the current file (`R`) or loads a different file (`o`), the system SHALL update the pristine file-level variables to the newly parsed values and re-merge the currently active environment variables over them, preserving the active environment. The pristine file-level variables SHALL reflect only the file's own declarations — environment variables MUST NOT be merged into them at load or reload time, so that a subsequent switch to the `(none)` environment falls back to the *currently loaded* file's variables, not the previously active environment's.

#### Scenario: Reload preserves active runtime environment
- **WHEN** the user has switched to `Staging` at runtime, then presses `R` to reload
- **THEN** the reloaded file's variables SHALL still be overridden by `Staging` values and the active environment SHALL remain `Staging`

#### Scenario: File load preserves active runtime environment
- **WHEN** the user has switched to `Staging` at runtime, then presses `o` and loads a different file
- **THEN** the new file's variables SHALL be overridden by `Staging` values and the active environment SHALL remain `Staging`

#### Scenario: File load preserves pristine base for later revert to (none)
- **WHEN** the active environment is `Staging` (defining `baseUrl = https://api.staging.com`) and the user loads a different file via `o` whose `@baseUrl = https://api.local`, then opens the env picker and applies `(none)`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `https://api.local` (the new file's pristine value), the environment variables SHALL be empty, and the active environment name SHALL be cleared

#### Scenario: Reload preserves pristine base for later revert to (none)
- **WHEN** the active environment is `Staging` (defining `baseUrl = https://api.staging.com`) and the user edits the current file to change `@baseUrl` to a new value, then presses `R` to reload, then opens the env picker and applies `(none)`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to the new file value (the reloaded file's pristine value), the environment variables SHALL be empty, and the active environment name SHALL be cleared
