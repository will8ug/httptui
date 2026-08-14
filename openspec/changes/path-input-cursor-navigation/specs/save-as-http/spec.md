## MODIFIED Requirements

### Requirement: Save overlay path input and confirmation

The save overlay SHALL display the current input value and allow the user to modify it via keyboard input. The path input SHALL behave as a single-line editor: printable characters SHALL be inserted at the cursor, `Backspace` SHALL delete the character before the cursor, `Delete` SHALL delete the character after the cursor, and `←`/`→` SHALL move the cursor one character, clamping at the input bounds. `Home` SHALL move the cursor to the start of the input and `End` SHALL move it to the end, with `Ctrl+A` and `Ctrl+E` as aliases. The cursor SHALL be rendered by inverting the cell at the cursor position, and by inverting a trailing space when the cursor is at the end of the input. The user SHALL press `Enter` to confirm the save or `Escape` to cancel. The entered path MAY be absolute or relative. If relative, the system SHALL resolve it against the directory of the currently loaded file (`path.dirname(state.filePath)`). If absolute, the system SHALL use it directly.

#### Scenario: Confirm save with an absolute path
- **WHEN** the user types `/tmp/output.http` and presses `Enter`
- **THEN** the system SHALL attempt to write the serialized content to `/tmp/output.http`

#### Scenario: Confirm save with a relative path
- **WHEN** the loaded file is `/home/user/collections/MyAPI.json`, the user types `exports/api.http` and presses `Enter`
- **THEN** the system SHALL resolve the path to `/home/user/collections/exports/api.http` and attempt to write there

#### Scenario: Cancel save with Escape
- **WHEN** the user presses `Escape` while the save overlay is open
- **THEN** the system SHALL close the overlay and return to normal mode without writing any file

#### Scenario: Typing a character inserts it at the cursor
- **WHEN** the save input is `api.http` with the cursor at offset 0 and the user types `x`
- **THEN** the input SHALL become `xapi.http` and the cursor SHALL be at offset 1

#### Scenario: Backspace deletes the character before the cursor
- **WHEN** the save input is `api.http` with the cursor at offset 3 and the user presses `Backspace`
- **THEN** the input SHALL become `ap.http` and the cursor SHALL be at offset 2

#### Scenario: Left arrow moves the cursor back one character
- **WHEN** the save input is `api.http` with the cursor at offset 3 and the user presses `←`
- **THEN** the cursor SHALL be at offset 2 and the input SHALL be unchanged

#### Scenario: Right arrow moves the cursor forward one character
- **WHEN** the save input is `api.http` with the cursor at offset 3 and the user presses `→`
- **THEN** the cursor SHALL be at offset 4 and the input SHALL be unchanged

#### Scenario: Left arrow clamps at the start of the input
- **WHEN** the cursor is at offset 0 and the user presses `←`
- **THEN** the cursor SHALL remain at offset 0

#### Scenario: Right arrow clamps at the end of the input
- **WHEN** the save input is `api.http` with the cursor at offset 8 and the user presses `→`
- **THEN** the cursor SHALL remain at offset 8

#### Scenario: Delete removes the character after the cursor
- **WHEN** the save input is `api.http` with the cursor at offset 0 and the user presses `Delete`
- **THEN** the input SHALL become `pi.http` and the cursor SHALL remain at offset 0

#### Scenario: Delete at the end of the input is a no-op
- **WHEN** the save input is `api.http` with the cursor at offset 8 and the user presses `Delete`
- **THEN** the input SHALL remain `api.http` and the cursor SHALL remain at offset 8

#### Scenario: Home moves the cursor to the start of the input
- **WHEN** the save input is `api.http` with the cursor at offset 4 and the user presses `Home`
- **THEN** the cursor SHALL be at offset 0 and the input SHALL be unchanged

#### Scenario: End moves the cursor to the end of the input
- **WHEN** the save input is `api.http` with the cursor at offset 4 and the user presses `End`
- **THEN** the cursor SHALL be at offset 8 and the input SHALL be unchanged

#### Scenario: Ctrl+A and Ctrl+E alias Home and End
- **WHEN** the save input is `api.http` with the cursor at offset 4 and the user presses `Ctrl+A` then `Ctrl+E`
- **THEN** the cursor SHALL move to offset 0 then to offset 8, with no `a` or `e` character inserted

### Requirement: Save error handling

If the write fails (e.g., permission denied, invalid path), the system SHALL display an error message in the save overlay (not a transient message) and SHALL keep the overlay open so the user can correct the path and retry. The error SHALL be cleared when the user modifies the input text (types, or deletes a character with `Backspace` or `Delete`). Moving the cursor with `←`/`→`/`Home`/`End` SHALL NOT clear the error.

#### Scenario: Write fails with permission error
- **WHEN** the user confirms a path that the process cannot write to (e.g., `/root/api.http` without permissions)
- **THEN** the save overlay SHALL display the error message inline and SHALL remain open

#### Scenario: Error clears on input change
- **WHEN** an error is displayed in the save overlay and the user types or deletes a character
- **THEN** the error message SHALL be cleared

#### Scenario: Cursor movement does not clear the error
- **WHEN** an error is displayed in the save overlay and the user presses `←` or `→` without changing the input text
- **THEN** the error message SHALL remain displayed
