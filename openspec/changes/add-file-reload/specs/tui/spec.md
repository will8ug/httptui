## ADDED Requirements

### Requirement: File reload action

The TUI SHALL support a `RELOAD_FILE` action that replaces the in-memory `requests` and `variables` with freshly parsed content from `filePath`. The action payload SHALL include `requests` (ParsedRequest[]) and `variables` (FileVariable[]).

#### Scenario: Successful reload replaces request list
- **WHEN** the user presses `R` and the file is readable with valid content
- **THEN** the TUI SHALL re-read the file from `filePath`, parse it, and dispatch `RELOAD_FILE` with the new data
- **AND** the request list SHALL reflect the new file contents

#### Scenario: Reload preserves selection by name
- **WHEN** the user presses `R` and the currently selected request name still exists in the reloaded file
- **THEN** the TUI SHALL keep that request selected

#### Scenario: Reload resets selection when name not found
- **WHEN** the user presses `R` and the currently selected request name no longer exists in the reloaded file
- **THEN** the TUI SHALL reset `selectedIndex` to 0

#### Scenario: Reload clears response and error
- **WHEN** the `RELOAD_FILE` action is dispatched
- **THEN** the TUI SHALL set `response` to `null` and `error` to `null`
- **AND** SHALL reset `responseScrollOffset` to 0

### Requirement: File reload input handler

The TUI SHALL bind the `R` key (Shift+R, uppercase) to trigger file reload. The reload handler SHALL read the file at `state.filePath` using `readFileSync`, parse it with `parseHttpFile`, and dispatch a `RELOAD_FILE` action with the result. If the file read or parse fails, the handler SHALL dispatch a `REQUEST_ERROR` action with the error message.

#### Scenario: Pressing R reloads the file
- **WHEN** the user presses `R` (uppercase)
- **THEN** the file at `state.filePath` SHALL be re-read and parsed
- **AND** the request list and variables SHALL be updated

#### Scenario: File read failure shows error
- **WHEN** the user presses `R` and the file cannot be read (e.g., deleted)
- **THEN** the TUI SHALL display an error message and preserve the current request list

#### Scenario: Lowercase r does not trigger reload
- **WHEN** the user presses `r` (lowercase)
- **THEN** the TUI SHALL toggle raw mode (existing behavior), not reload the file

### Requirement: Reload confirmation message

The TUI SHALL display a temporary confirmation in the status bar when the file is reloaded. The message SHALL show "Reloaded" and disappear after 2 seconds.

#### Scenario: Status bar shows reload confirmation
- **WHEN** the `RELOAD_FILE` action is dispatched successfully
- **THEN** the status bar SHALL display "Reloaded" for 2 seconds

#### Scenario: Confirmation disappears after 2 seconds
- **WHEN** 2 seconds have passed since the reload confirmation appeared
- **THEN** the status bar SHALL clear the reload message

### Requirement: Help overlay includes reload shortcut

The help overlay SHALL list `R` as the "Reload file" shortcut.

#### Scenario: Help overlay shows R key
- **WHEN** the help overlay is displayed
- **THEN** it SHALL show `R` with the description "Reload file"

## MODIFIED Requirements

_(no existing requirements are being modified — only additions)_