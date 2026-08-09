# Spec: Unsaved Changes

## Purpose

The file-level unsaved-changes marker, when it is set and cleared, and the confirmation prompt that guards actions which would discard uncommitted-to-disk edits.
## Requirements
### Requirement: Track unsaved changes at the file level

The system SHALL track unsaved changes per request: each in-memory request SHALL carry a marker indicating whether it has been edited since the last load, reload, or save. A committed edit that changes a request's stored value SHALL set that request's marker; a commit producing a value identical to the request's stored value SHALL NOT set the marker. Once set, a request's marker SHALL remain set until the file is loaded, reloaded, or saved — a later edit that reverts the request to its original value SHALL NOT clear it. The file-level unsaved-changes flag SHALL be derived from the per-request markers: it SHALL be set when any request's marker is set and SHALL be unset when no request's marker is set. Every marker SHALL start unset when the application launches.

#### Scenario: Committing a change sets that request's marker

- **WHEN** the user commits a body edit whose value differs from the request's previous body
- **THEN** that request's marker SHALL be set

#### Scenario: Committing an unchanged value leaves the marker unset

- **WHEN** the user opens the body editor and commits without altering the buffer
- **THEN** the request's marker SHALL remain unset

#### Scenario: Cancelling an edit leaves the marker unset

- **WHEN** the user modifies the editor buffer and cancels with `Escape`
- **THEN** the request's marker SHALL remain unset

#### Scenario: Editing one request leaves other requests unmarked

- **WHEN** the user commits a body edit on one request
- **THEN** only that request's marker SHALL be set
- **AND** every other request's marker SHALL remain unset

#### Scenario: Markers are unset on launch

- **WHEN** the application starts
- **THEN** every request's marker SHALL be unset

#### Scenario: Reverting a body to its original value keeps the marker set

- **WHEN** the user commits a body edit and then commits a second edit restoring the body to its value at load time
- **THEN** the request's marker SHALL remain set

#### Scenario: File-level flag is set when any request is marked

- **WHEN** at least one request's marker is set
- **THEN** the file-level unsaved-changes flag SHALL be set

#### Scenario: File-level flag is unset when no request is marked

- **WHEN** no request's marker is set
- **THEN** the file-level unsaved-changes flag SHALL be unset

### Requirement: Status bar shows an unsaved-changes marker

While the unsaved-changes flag is set, the status bar SHALL prefix the file name in its right-hand segment with `*`. While the flag is unset, the file name SHALL be rendered without the prefix. This marker is additional to the indicators described in the **status-bar**, **shortcuts**, **runtime-environment-switching**, and **executor** specs.

#### Scenario: Marker shown when there are unsaved changes

- **WHEN** the status bar is rendered while the unsaved-changes flag is set and the loaded file is `api.http`
- **THEN** the status text SHALL show `*api.http`

#### Scenario: Marker absent when there are no unsaved changes

- **WHEN** the status bar is rendered while the unsaved-changes flag is unset and the loaded file is `api.http`
- **THEN** the status text SHALL show `api.http` with no `*` prefix

#### Scenario: Marker appears in every panel-focus context

- **WHEN** the unsaved-changes flag is set and focus is on the response panel
- **THEN** the status text SHALL show the `*` prefix followed by the file name and the response scroll position

### Requirement: Successful save clears the unsaved-changes flag

Any successful save SHALL clear every request's unsaved-changes marker — the file-level flag is derived from the markers, so clearing them un-sets it — and SHALL set the current file path to the actual written path. A save-as (`S`) succeeds only when it writes to a path that does not already exist; when the target exists, the save-as is refused and every marker SHALL remain set (see the **save-as-http** spec). An in-place save (`Ctrl+S`) succeeds by overwriting the source file and SHALL also clear every marker, leaving the current file path unchanged (see the **in-place-save** spec). The markers SHALL clear because the in-memory requests are synced to the file the application now tracks.

#### Scenario: Save clears the markers

- **WHEN** at least one request's marker is set and the user completes a save with `S`
- **THEN** every request's marker SHALL be cleared and the status bar SHALL no longer show the `*` prefix

#### Scenario: Refused save leaves the markers set and the file unchanged

- **WHEN** the loaded file is `api.http`, at least one request's marker is set, and the save is refused because the target path already exists
- **THEN** every request's marker SHALL remain set and the current file path SHALL NOT change

#### Scenario: Failed save leaves the markers set and the file unchanged

- **WHEN** a save fails and the save overlay reports the error
- **THEN** every request's marker SHALL remain set and the current file path SHALL NOT change

#### Scenario: In-place save clears the markers

- **WHEN** at least one request's marker is set and the user completes an in-place save with `Ctrl+S`
- **THEN** every request's marker SHALL be cleared and the status bar SHALL no longer show the `*` prefix
- **AND** the current file path SHALL remain unchanged

#### Scenario: Refused in-place save leaves the markers set

- **WHEN** at least one request's marker is set and an in-place save is refused because an edited body contains a `###` separator line
- **THEN** every request's marker SHALL remain set

#### Scenario: Declined in-place save leaves the markers set

- **WHEN** at least one request's marker is set and the user declines the in-place save confirmation prompt (`n` or `Escape`)
- **THEN** every request's marker SHALL remain set and the current file path SHALL NOT change

### Requirement: Loading or reloading a file clears the unsaved-changes flag

Reloading the current file and loading a different file both replace the in-memory requests with content read from disk, so both SHALL clear the unsaved-changes flag.

#### Scenario: Reload clears the marker

- **WHEN** the unsaved-changes flag is set and a file reload completes
- **THEN** the flag SHALL be cleared

#### Scenario: Load clears the marker

- **WHEN** the unsaved-changes flag is set and a different file is loaded
- **THEN** the flag SHALL be cleared

### Requirement: Confirm before discarding unsaved changes

While the unsaved-changes flag is set, pressing `R` (reload), `o` (open a different file), or `q` (quit) SHALL NOT perform the action immediately. The system SHALL instead enter a confirmation mode, record which action was intercepted, and display a confirmation prompt. When the flag is unset, all three keys SHALL behave exactly as they do today with no prompt.

#### Scenario: Reload is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `R`
- **THEN** a confirmation prompt SHALL be displayed and the file SHALL NOT be reloaded

#### Scenario: Open file is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `o`
- **THEN** a confirmation prompt SHALL be displayed and the file-load overlay SHALL NOT be displayed

#### Scenario: Quit is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `q`
- **THEN** a confirmation prompt SHALL be displayed and the application SHALL NOT exit

#### Scenario: No prompt when there are no unsaved changes

- **WHEN** the unsaved-changes flag is unset and the user presses `R`
- **THEN** the file SHALL reload immediately with no confirmation prompt

### Requirement: Confirmation prompt resolution

The confirmation prompt SHALL accept `y` to proceed and `n` or `Escape` to abandon. Proceeding SHALL return to normal mode and then perform the originally intercepted action. The unsaved-changes flag SHALL NOT be cleared at confirmation time; it SHALL be cleared by the performed action only when in-memory state is actually synced to disk — a completed reload, a completed load, or a completed save. If the performed action is abandoned or fails before syncing, the flag SHALL remain set. Abandoning the prompt SHALL return to normal mode, leave the unsaved-changes flag set, and perform no action. Keys other than `y`, `n`, and `Escape` SHALL be ignored while the prompt is displayed.

#### Scenario: Confirming a reload proceeds

- **WHEN** the confirmation prompt is displayed for an intercepted reload and the user presses `y`
- **THEN** the file SHALL be reloaded, the unsaved-changes flag SHALL be cleared by the completed reload, and `mode` SHALL return to `'normal'`

#### Scenario: Confirming an open proceeds to the file-load overlay

- **WHEN** the confirmation prompt is displayed for an intercepted open and the user presses `y`
- **THEN** the file-load overlay SHALL be displayed and the unsaved-changes flag SHALL remain set until the new file is loaded

#### Scenario: Cancelling the file-load overlay after confirming preserves the flag

- **WHEN** the user confirms an intercepted open, the file-load overlay is displayed, and the user presses `Escape`
- **THEN** the unsaved-changes flag SHALL remain set and the status bar SHALL continue to show the `*` prefix

#### Scenario: A failed reload after confirming preserves the flag

- **WHEN** the user confirms an intercepted reload and the file read or parse fails
- **THEN** the unsaved-changes flag SHALL remain set and the status bar SHALL continue to show the `*` prefix

#### Scenario: Confirming a quit exits

- **WHEN** the confirmation prompt is displayed for an intercepted quit and the user presses `y`
- **THEN** the application SHALL exit

#### Scenario: Declining with n abandons the action

- **WHEN** the confirmation prompt is displayed and the user presses `n`
- **THEN** the prompt SHALL close, `mode` SHALL return to `'normal'`, the unsaved-changes flag SHALL remain set, and the intercepted action SHALL NOT be performed

#### Scenario: Declining with Escape abandons the action

- **WHEN** the confirmation prompt is displayed and the user presses `Escape`
- **THEN** the prompt SHALL close and the intercepted action SHALL NOT be performed

#### Scenario: Unrelated keys are ignored

- **WHEN** the confirmation prompt is displayed and the user presses `v`
- **THEN** the prompt SHALL remain displayed and verbose mode SHALL NOT toggle

### Requirement: Ctrl+C bypasses the confirmation prompt

`Ctrl+C` SHALL exit the application immediately regardless of the unsaved-changes flag, preserving the terminal convention that the interrupt key always terminates.

#### Scenario: Ctrl+C exits with unsaved changes present

- **WHEN** the unsaved-changes flag is set and the user presses `Ctrl+C`
- **THEN** the application SHALL exit without displaying a confirmation prompt

### Requirement: Confirmation prompt presentation

The confirmation prompt SHALL render through the existing overlay slot using the established overlay styling: a rounded border in `cyanBright` and a bold `cyanBright` title. It SHALL state that there are unsaved changes, name the action that will be performed on confirmation, and show the available keys.

#### Scenario: Prompt describes the pending action

- **WHEN** the confirmation prompt is displayed for an intercepted quit
- **THEN** the prompt SHALL indicate that unsaved changes exist and that confirming will quit

#### Scenario: Prompt shows the available keys

- **WHEN** the confirmation prompt is displayed
- **THEN** it SHALL show that `y` proceeds and that `n` or `Escape` cancels
