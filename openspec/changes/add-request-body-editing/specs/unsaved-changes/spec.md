## ADDED Requirements

### Requirement: Track unsaved changes at the file level

The system SHALL track a single file-level unsaved-changes flag rather than per-request state. The flag SHALL be set when a committed edit changes a request's stored value, and SHALL remain unset when a commit produces a value identical to the previous one. The flag SHALL start unset when the application launches.

#### Scenario: Committing a change sets the flag

- **WHEN** the user commits a body edit whose value differs from the request's previous body
- **THEN** the unsaved-changes flag SHALL be set

#### Scenario: Committing an unchanged value leaves the flag unset

- **WHEN** the user opens the body editor and commits without altering the buffer
- **THEN** the unsaved-changes flag SHALL remain unset

#### Scenario: Cancelling an edit leaves the flag unset

- **WHEN** the user modifies the editor buffer and cancels with `Escape`
- **THEN** the unsaved-changes flag SHALL remain unset

#### Scenario: Flag is unset on launch

- **WHEN** the application starts
- **THEN** the unsaved-changes flag SHALL be unset

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

Any successful save SHALL clear the unsaved-changes flag. Because the save command writes to a new file and auto-increments a suffix on conflict (see the **save-as-http** spec), the flag SHALL clear even when the written path differs from the loaded file path.

#### Scenario: Save clears the marker

- **WHEN** the unsaved-changes flag is set and the user completes a save with `S`
- **THEN** the flag SHALL be cleared and the status bar SHALL no longer show the `*` prefix

#### Scenario: Save to a conflict-suffixed path clears the marker

- **WHEN** the loaded file is `api.http`, the unsaved-changes flag is set, and the save writes to `api - 1.http` because the target already exists
- **THEN** the flag SHALL be cleared

#### Scenario: Failed save leaves the marker set

- **WHEN** a save fails and the save overlay reports the error
- **THEN** the unsaved-changes flag SHALL remain set

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

The confirmation prompt SHALL accept `y` to proceed and `n` or `Escape` to abandon. Proceeding SHALL clear the unsaved-changes flag, return to normal mode, and then perform the originally intercepted action. Abandoning SHALL return to normal mode, leave the unsaved-changes flag set, and perform no action. Keys other than `y`, `n`, and `Escape` SHALL be ignored while the prompt is displayed.

#### Scenario: Confirming a reload proceeds

- **WHEN** the confirmation prompt is displayed for an intercepted reload and the user presses `y`
- **THEN** the file SHALL be reloaded, the unsaved-changes flag SHALL be cleared, and `mode` SHALL return to `'normal'`

#### Scenario: Confirming an open proceeds to the file-load overlay

- **WHEN** the confirmation prompt is displayed for an intercepted open and the user presses `y`
- **THEN** the file-load overlay SHALL be displayed and the unsaved-changes flag SHALL be cleared

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
