## MODIFIED Requirements

### Requirement: Confirm before discarding unsaved changes

While the unsaved-changes flag is set, pressing `R` (reload), `o` (open a different file), `q` (quit), or `Ctrl+G` (open the source file in an external editor) SHALL NOT perform the action immediately. The system SHALL instead enter a confirmation mode, record which action was intercepted, and display a confirmation prompt. When the flag is unset, all four keys SHALL behave exactly as they do today with no prompt.

`Ctrl+G` is intercepted because the file on disk does not contain edits that have been committed in the request editor but not yet saved; handing that file to an external editor and reloading it would discard them. The interception SHALL occur only once the handoff is otherwise permitted — a source that fails the http-format gate SHALL be refused before any prompt is displayed (see the **editor-handoff** spec).

#### Scenario: Reload is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `R`
- **THEN** a confirmation prompt SHALL be displayed and the file SHALL NOT be reloaded

#### Scenario: Open file is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `o`
- **THEN** a confirmation prompt SHALL be displayed and the file-load overlay SHALL NOT be displayed

#### Scenario: Quit is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `q`
- **THEN** a confirmation prompt SHALL be displayed and the application SHALL NOT exit

#### Scenario: External editor handoff is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `Ctrl+G` on an http-format source
- **THEN** a confirmation prompt SHALL be displayed and no editor SHALL be launched

#### Scenario: A refused source is not intercepted

- **WHEN** the unsaved-changes flag is set and the user presses `Ctrl+G` on a Postman or OpenAPI source
- **THEN** no confirmation prompt SHALL be displayed and the format refusal message SHALL be shown instead

#### Scenario: No prompt when there are no unsaved changes

- **WHEN** the unsaved-changes flag is unset and the user presses `R`
- **THEN** the file SHALL reload immediately with no confirmation prompt

#### Scenario: No prompt for the external editor when there are no unsaved changes

- **WHEN** the unsaved-changes flag is unset and the user presses `Ctrl+G` on an http-format source
- **THEN** the editor SHALL be launched immediately with no confirmation prompt

### Requirement: Confirmation prompt resolution

The confirmation prompt SHALL accept `y` to proceed and `n` or `Escape` to abandon. Proceeding SHALL return to normal mode and then perform the originally intercepted action. The unsaved-changes flag SHALL NOT be cleared at confirmation time; it SHALL be cleared by the performed action only when in-memory state is actually synced to disk — a completed reload, a completed load, or a completed save. If the performed action is abandoned or fails before syncing, the flag SHALL remain set. Abandoning the prompt SHALL return to normal mode, leave the unsaved-changes flag set, and perform no action. Keys other than `y`, `n`, and `Escape` SHALL be ignored while the prompt is displayed.

#### Scenario: Confirming a reload proceeds

- **WHEN** the confirmation prompt is displayed for an intercepted reload and the user presses `y`
- **THEN** the file SHALL be reloaded, the unsaved-changes flag SHALL be cleared by the completed reload, and `mode` SHALL return to `'normal'`

#### Scenario: Confirming an open proceeds to the file-load overlay

- **WHEN** the confirmation prompt is displayed for an intercepted open and the user presses `y`
- **THEN** the file-load overlay SHALL be displayed and the unsaved-changes flag SHALL remain set until the new file is loaded

#### Scenario: Confirming an external editor handoff launches the editor

- **WHEN** the confirmation prompt is displayed for an intercepted external editor handoff and the user presses `y`
- **THEN** the editor SHALL be launched and the unsaved-changes flag SHALL remain set until the file is reloaded

#### Scenario: Abandoning an external editor handoff launches no editor

- **WHEN** the confirmation prompt is displayed for an intercepted external editor handoff and the user presses `n` or `Escape`
- **THEN** no editor SHALL be launched, the unsaved-changes flag SHALL remain set, and `mode` SHALL return to `'normal'`

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

### Requirement: Confirmation prompt presentation

The confirmation prompt SHALL render through the existing overlay slot using the established overlay styling: a rounded border in `cyanBright` and a bold `cyanBright` title. It SHALL state that there are unsaved changes, name the action that will be performed on confirmation, and show the available keys. Every intercepted action SHALL have its own description, so the prompt never leaves the user guessing which action they are confirming.

#### Scenario: Prompt describes the pending action

- **WHEN** the confirmation prompt is displayed for an intercepted quit
- **THEN** the prompt SHALL indicate that unsaved changes exist and that confirming will quit

#### Scenario: Prompt describes a pending external editor handoff

- **WHEN** the confirmation prompt is displayed for an intercepted external editor handoff
- **THEN** the prompt SHALL indicate that unsaved changes exist and that confirming will open an external editor

#### Scenario: Prompt shows the available keys

- **WHEN** the confirmation prompt is displayed
- **THEN** it SHALL show that `y` proceeds and that `n` or `Escape` cancels
