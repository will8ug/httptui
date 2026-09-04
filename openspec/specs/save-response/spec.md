# Spec: Save Response

## Purpose

Saving the response body currently displayed in the response panel to a file via an `s`-triggered save overlay, with a request-name-derived default path, raw-body fidelity, and conflict refusal.

## Requirements

### Requirement: Enter response save with s in normal mode

Pressing `s` in normal mode while a response is displayed SHALL open the response-save overlay. Pressing `s` when no response is displayed (no response received yet, or the last send failed) SHALL NOT open the overlay and SHALL display a transient message stating there is no response to save. The `s` key SHALL open the overlay only in normal mode; while any other overlay or input mode is active (file load, search, environment select, save-as, request editor, or a confirmation prompt), `s` SHALL be handled as that mode's input instead. While the response-save overlay itself is open, `s` SHALL be inserted into the path input as text.

#### Scenario: Press s with a response opens the overlay

- **WHEN** a response is displayed in the response panel and the user presses `s` in normal mode
- **THEN** the response-save overlay SHALL be displayed with the default path pre-filled
- **AND** no file SHALL be written yet

#### Scenario: Press s with no response shows a transient message

- **WHEN** no response has been received and the user presses `s` in normal mode
- **THEN** the overlay SHALL NOT open
- **AND** a transient message stating there is no response to save SHALL be displayed

#### Scenario: Press s while the request editor is open inserts nothing

- **WHEN** the request editor is open and the user presses `s`
- **THEN** the `s` SHALL be handled as editor input and SHALL NOT open the response-save overlay

#### Scenario: Press s while the response-save overlay is open types the character

- **WHEN** the response-save overlay is open and the user presses `s`
- **THEN** `s` SHALL be inserted into the path input and the overlay SHALL remain open

### Requirement: Default path derivation

When the overlay opens, the path input SHALL be pre-filled with a default filename derived from the currently selected request's name and the stored response body: `<name>.json` when the stored body parses as JSON (the same detection the response panel uses to pretty-print), `<name>.txt` otherwise. Each `/` in the request name SHALL be replaced with `-` (Postman folder-prefixed names contain ` / ` separators). The default SHALL contain no directory components, and the cursor SHALL be placed at the end of the input.

#### Scenario: JSON response defaults to request name with .json

- **WHEN** the selected request is named `Get Users`, the displayed response body is `{"items":[]}`, and the user presses `s`
- **THEN** the path input SHALL be pre-filled with `Get Users.json` with the cursor at the end

#### Scenario: Non-JSON response defaults to .txt

- **WHEN** the selected request is named `Get Page`, the displayed response body is `<html></html>`, and the user presses `s`
- **THEN** the path input SHALL be pre-filled with `Get Page.txt`

#### Scenario: Slash-separated names are sanitized

- **WHEN** the selected request's name is `Auth / Login` and the user presses `s`
- **THEN** the default filename SHALL be `Auth - Login.json` (or `.txt`), containing no `/` characters

#### Scenario: Raw display toggle does not affect the extension

- **WHEN** the response body is valid JSON and raw display mode is enabled and the user presses `s`
- **THEN** the default filename SHALL still end with `.json`

### Requirement: Raw body fidelity

The written file SHALL contain the stored response body verbatim — exactly the body captured for the displayed response, with no pretty-printing, no status line, and no headers — regardless of the wrap, raw, or verbose display toggles.

#### Scenario: JSON body is saved unformatted

- **WHEN** the displayed response body is the single line `{"a":1}` and the user confirms the save
- **THEN** the written file SHALL contain `{"a":1}` on one line and SHALL NOT contain indented JSON

#### Scenario: Pretty-printed display does not alter the saved file

- **WHEN** the response panel displays the body pretty-printed across multiple indented lines and the user confirms the save
- **THEN** the written file SHALL contain the original single-line body

### Requirement: Path input and confirmation

The path input SHALL offer the same single-line editing behaviors as the save-as path input (character insertion at the cursor, `Backspace`, `Delete`, `←`/`→`, `Home`/`End` with `Ctrl+A`/`Ctrl+E` aliases, and the inverted-cell cursor rendering — see the **save-as-http** spec). `Enter` SHALL confirm the save and `Escape` SHALL cancel it without writing. A relative path SHALL resolve against the directory of the currently loaded file; an absolute path SHALL be used as-is.

#### Scenario: Confirm with a relative path writes next to the source

- **WHEN** the loaded file is `/home/user/apis/api.http` and the user confirms the pre-filled `Get Users.json`
- **THEN** the system SHALL write to `/home/user/apis/Get Users.json`

#### Scenario: Confirm with an absolute path writes there directly

- **WHEN** the user edits the path to `/tmp/out.json` and presses `Enter`
- **THEN** the system SHALL write to `/tmp/out.json`

#### Scenario: Cancel with Escape writes nothing

- **WHEN** the user presses `Escape` while the response-save overlay is open
- **THEN** the overlay SHALL close, the application SHALL return to normal mode, and no file SHALL be written

#### Scenario: Empty path is refused

- **WHEN** the user clears the input and presses `Enter`
- **THEN** an inline error SHALL be displayed and the overlay SHALL remain open

### Requirement: File-name conflict refusal

When the resolved target path already exists, the system SHALL refuse the save: it SHALL NOT write any file, it SHALL display an inline error in the overlay, and the overlay SHALL remain open so the user can modify the path. The error SHALL be cleared when the user modifies the input text, matching the save-as error behavior (see the **save-as-http** spec).

#### Scenario: Existing target is refused

- **WHEN** the resolved target path is `/home/user/apis/Get Users.json` and that file already exists
- **THEN** no file SHALL be written
- **AND** the overlay SHALL display an error naming the file and SHALL remain open

#### Scenario: Error clears on input change

- **WHEN** a conflict error is displayed and the user types or deletes a character
- **THEN** the error message SHALL be cleared

#### Scenario: Retrying with a fresh path succeeds

- **WHEN** a conflict error is displayed and the user edits the path to a name that does not exist and presses `Enter`
- **THEN** the file SHALL be written to the new path

### Requirement: Save error handling

If the write fails (for example, permission denied or an invalid path), the system SHALL display the error inline in the overlay and keep the overlay open so the user can correct the path and retry.

#### Scenario: Permission error keeps the overlay open

- **WHEN** the user confirms a path the process cannot write to
- **THEN** the overlay SHALL display the error inline and SHALL remain open

### Requirement: Success feedback without rebinding the current file

On a successful write, the system SHALL display a transient message naming the written file (for example `Saved response to Get Users.json`) using the existing transient-message mechanism, and the overlay SHALL close. The current file path SHALL NOT change: the status bar SHALL continue to show the loaded file, and reload SHALL continue to read the loaded file. No request's unsaved-changes marker SHALL be altered.

#### Scenario: Successful save shows a transient message

- **WHEN** the response body is written to `/home/user/apis/Get Users.json`
- **THEN** the status bar SHALL display a transient message naming `Get Users.json`

#### Scenario: The current file is not rebound

- **WHEN** the user saves a response while `/home/user/apis/api.http` is loaded
- **THEN** the status bar SHALL continue to show `api.http`
- **AND** pressing the reload key SHALL reload `api.http`

### Requirement: Saved content follows the displayed response, not the selection

The written content SHALL be the body of the response currently displayed in the response panel — the most recently received response — while the default filename SHALL be derived from the currently selected request. When the user sends one request and then selects another without sending, the overlay's default name SHALL reflect the selected request and the saved content SHALL remain the displayed response's body.

#### Scenario: Navigating after sending keeps the displayed body

- **WHEN** the user sends request `Login`, then selects request `Get Users` without sending it, then presses `s` and confirms
- **THEN** the default filename SHALL derive from `Get Users`
- **AND** the written file SHALL contain the body of the `Login` response
