## MODIFIED Requirements

### Requirement: Apply selected environment at runtime
When the user applies an environment option, the system SHALL load and parse that environment's file, set the environment variables to the parsed values, re-merge them over the pristine file-level variables (environment variables taking precedence), update the active environment name, reset the response and scroll state, and return to normal mode. Applying the `(none)` option SHALL set the environment variables to an empty list, re-merge (yielding only file-level variables), and clear the active environment name. If the environment file cannot be read or parsed, the system SHALL display an inline error in the picker and keep the picker open.

#### Scenario: Switching environment re-merges variables
- **WHEN** the active environment is `Development` (defining `baseUrl = https://api.dev.com`) and the user applies `Staging` (defining `baseUrl = https://api.staging.com`)
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `https://api.staging.com` and the active environment name SHALL become `Staging`

#### Scenario: Environment variables still win after switching
- **WHEN** the `.http` file declares `@baseUrl = https://api.local` and the user applies an environment defining `baseUrl = https://api.dev.com`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `https://api.dev.com` (environment value wins)

#### Scenario: No stale variables leak between environments
- **WHEN** the active environment is `Staging` (defining `stagingOnly = x` and `baseUrl = ...`) and the user applies `Production` (defining only `baseUrl = ...`)
- **THEN** requests containing `{{stagingOnly}}` SHALL NOT resolve to `x` (the Staging-only variable SHALL NOT persist)

#### Scenario: Applying none reverts to file variables
- **WHEN** the active environment is `Development` and the user applies the `(none)` option
- **THEN** environment variables SHALL be empty, only file-level variables SHALL apply, and the active environment name SHALL be cleared

#### Scenario: Apply resets response and scroll
- **WHEN** a response is displayed and scrolled, and the user applies a different environment
- **THEN** the displayed response SHALL be cleared and scroll offsets SHALL reset

#### Scenario: Missing environment file shows inline error
- **WHEN** the user applies an environment whose file no longer exists
- **THEN** the picker SHALL remain open and SHALL display an inline error indicating the environment file could not be loaded, and the active environment SHALL remain unchanged
