# Spec: Runtime Environment Switching

## Purpose

Allow users to switch between configured environment files at runtime via a keyboard-driven picker overlay, without restarting the application. The active environment's variables are merged over file-level variables (with file-level variables taking precedence), and the selection persists across file reloads and file loads.

## Requirements

### Requirement: Environment switcher shortcut
The system SHALL register a keyboard shortcut with `key: 'E'` in the centralized `SHORTCUTS` registry (`src/core/shortcuts.ts`) that, when pressed in normal mode, opens the environment picker overlay. The shortcut SHALL use `description: 'Switch environment'`, `group: 'request'`, `showInBar: false`, and `showInHelp: true`. The `E` key SHALL be ignored while the help overlay, file-load mode, or search mode is active.

#### Scenario: Registry contains E entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'E'`, `description` equal to `'Switch environment'`, `group` equal to `'request'`, `showInBar` equal to `false`, and `showInHelp` equal to `true`

#### Scenario: E opens the environment picker
- **WHEN** the application is in normal mode with at least one selectable environment available and the user presses `E`
- **THEN** the environment picker overlay SHALL open and the application mode SHALL become `'envSelect'`

#### Scenario: E is ignored while another overlay is active
- **WHEN** the help overlay, file-load mode, or search mode is active and the user presses `E`
- **THEN** the environment picker SHALL NOT open and the current overlay/mode SHALL remain unchanged

#### Scenario: E in help overlay appears in help
- **WHEN** the help overlay is visible
- **THEN** the `E` entry SHALL appear with key `E` in yellow (padded to 8 characters) and description `Switch environment` in white, within the Request group

### Requirement: Available environments aggregation
The system SHALL aggregate the list of selectable environments from two sources: the `environments[]` array of the loaded configuration (`config.json` / `.httptui.json`) mapped to `{ name, file }`, and — when the application was launched with `--env <path>` — the top-level `name` of that environment file mapped to `{ name, file: <path> }`. When the `--env` file's name conflicts with a configured environment name, the `--env` file's entry SHALL replace the configured entry (the `--env` file's name takes priority). The picker SHALL additionally present a synthetic `(none)` option that, when applied, removes all environment variables.

#### Scenario: Names come from config environments
- **WHEN** the configuration defines `environments: [{ name: "Development", file: "env/dev.json" }, { name: "Staging", file: "env/staging.json" }]` and the app is launched without `--env`
- **THEN** the picker SHALL list `Development` and `Staging` (plus the `(none)` option)

#### Scenario: Name comes from the --env file
- **WHEN** the app is launched with `--env dev.json` where `dev.json` has top-level `name: "Dev Local"` and the configuration defines no environments
- **THEN** the picker SHALL list `Dev Local` (plus the `(none)` option)

#### Scenario: --env file name wins on conflict
- **WHEN** the configuration defines `environments: [{ name: "Development", file: "env/dev.json" }]` and the app is launched with `--env other.json` where `other.json` has top-level `name: "Development"`
- **THEN** the picker SHALL list a single `Development` option whose file is `other.json` (the `--env` file's entry replaces the configured one)

#### Scenario: None option is always present
- **WHEN** the environment picker is opened with any non-empty set of environments
- **THEN** a `(none)` option SHALL be present in the list

### Requirement: Environment picker overlay
The system SHALL render the environment picker as a centered overlay matching existing overlay conventions: `borderStyle="round"`, `borderColor="cyanBright"`, centered via `justifyContent="center"` and `alignItems="center"`, and width `Math.min(72, Math.max(48, columns - 6))`. The overlay SHALL display a `cyanBright` bold title `Select Environment`, the list of environment options, and a `gray` footer hint describing the controls. The highlighted option SHALL be rendered in `cyan` bold. The currently active environment SHALL be marked with a `magenta` `● ` prefix. Only one overlay SHALL be active at a time.

#### Scenario: Overlay renders with conventions
- **WHEN** the environment picker is visible
- **THEN** it SHALL render a round `cyanBright`-bordered box centered in the terminal with a `cyanBright` bold `Select Environment` title and a `gray` footer hint

#### Scenario: Highlighted option styling
- **WHEN** an option is highlighted in the picker
- **THEN** that option's text SHALL be rendered in `cyan` bold

#### Scenario: Active environment marker
- **WHEN** the picker is open and an environment is currently active
- **THEN** the active environment's row SHALL display a `magenta` `● ` prefix

### Requirement: Environment picker navigation and selection
The system SHALL support moving the highlight within the picker using the up/down arrow keys and `k`/`j`, clamped to the list bounds without wrapping. When the picker opens, the highlight SHALL be initialized to the currently active environment, or to the `(none)` option when no environment is active. Pressing `Enter` SHALL apply the highlighted option. Pressing `Esc` SHALL close the picker without changing the active environment.

#### Scenario: Highlight initialized to active environment
- **WHEN** the active environment is `Staging` and the user opens the picker
- **THEN** the highlight SHALL start on the `Staging` row

#### Scenario: Highlight initialized to none when no environment active
- **WHEN** no environment is active and the user opens the picker
- **THEN** the highlight SHALL start on the `(none)` row

#### Scenario: Navigation is clamped
- **WHEN** the highlight is on the first option and the user presses up (or on the last option and presses down)
- **THEN** the highlight SHALL remain on that option (no wrap)

#### Scenario: Escape cancels without change
- **WHEN** the picker is open with active environment `Development` and the user presses `Esc`
- **THEN** the picker SHALL close, the mode SHALL return to `'normal'`, and the active environment SHALL remain `Development`

### Requirement: Apply selected environment at runtime
When the user applies an environment option, the system SHALL load and parse that environment's file, set the environment variables to the parsed values, re-merge them over the pristine file-level variables (file-level variables taking precedence), update the active environment name, reset the response and scroll state, and return to normal mode. Applying the `(none)` option SHALL set the environment variables to an empty list, re-merge (yielding only file-level variables), and clear the active environment name. If the environment file cannot be read or parsed, the system SHALL display an inline error in the picker and keep the picker open.

#### Scenario: Switching environment re-merges variables
- **WHEN** the active environment is `Development` (defining `baseUrl = https://api.dev.com`) and the user applies `Staging` (defining `baseUrl = https://api.staging.com`)
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `https://api.staging.com` and the active environment name SHALL become `Staging`

#### Scenario: File variables still win after switching
- **WHEN** the `.http` file declares `@baseUrl = https://api.local` and the user applies an environment defining `baseUrl = https://api.dev.com`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `https://api.local` (file value wins)

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

### Requirement: No environments available behavior
When no environments are available (the configuration defines no environments and the application was not launched with `--env`), pressing `E` SHALL NOT open the picker. Instead the system SHALL show a transient status message `No environments configured` that auto-clears after approximately 2 seconds.

#### Scenario: E with no environments shows status message
- **WHEN** no environments are configured and no `--env` file was provided, and the user presses `E`
- **THEN** the picker SHALL NOT open and a transient status message `No environments configured` SHALL be shown and then auto-cleared

### Requirement: Active environment indicator in status bar
The status bar SHALL display the currently active environment name in `magenta` bold in its right segment, positioned after the reload message indicator. When no environment is active, no environment indicator SHALL be rendered.

#### Scenario: Active environment shown
- **WHEN** the active environment is `Staging`
- **THEN** the status bar SHALL render `Staging` in `magenta` bold in its right segment

#### Scenario: No indicator when no environment active
- **WHEN** no environment is active
- **THEN** the status bar SHALL NOT render any environment indicator

### Requirement: Pristine file-variable base preserved across reload and file load
The system SHALL maintain the pristine file-level variables (before any environment merge) in application state. When the user reloads the current file (`R`) or loads a different file (`o`), the system SHALL update the pristine file-level variables to the newly parsed values and re-merge the currently active environment variables over them, preserving the active environment.

#### Scenario: Reload preserves active runtime environment
- **WHEN** the user has switched to `Staging` at runtime, then presses `R` to reload
- **THEN** the reloaded file's variables SHALL still be overridden by `Staging` values and the active environment SHALL remain `Staging`

#### Scenario: File load preserves active runtime environment
- **WHEN** the user has switched to `Staging` at runtime, then presses `o` and loads a different file
- **THEN** the new file's variables SHALL be overridden by `Staging` values and the active environment SHALL remain `Staging`
