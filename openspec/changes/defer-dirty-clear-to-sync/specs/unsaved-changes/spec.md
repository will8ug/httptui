## MODIFIED Requirements

### Requirement: Confirmation prompt resolution

The confirmation prompt SHALL accept `y` to proceed and `n` or `Escape` to abandon. Proceeding SHALL return to normal mode and then perform the originally intercepted action. The unsaved-changes flag SHALL NOT be cleared at confirmation time; it SHALL be cleared by the performed action only when in-memory state is actually synced to disk — a completed reload, a completed load, or a completed save. If the performed action is abandoned or fails before syncing, the flag SHALL remain set. Abandoning the prompt SHALL return to normal mode, leave the unsaved-changes flag set, and perform no action. Keys other than `y`, `n`, and `Escape` SHALL be ignored while the prompt is displayed.

#### Scenario: Confirming a reload proceeds

- **WHEN** the confirmation prompt is displayed for an intercepted reload and the user presses `y`
- **THEN** the file SHALL be reloaded, the unsaved-changes flag SHALL be cleared by the completed reload, and `mode` SHALL return to `'normal'`

#### Scenario: Confirming an open proceeds to the file-load overlay without clearing the flag

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
