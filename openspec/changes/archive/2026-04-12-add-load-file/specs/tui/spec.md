## ADDED Requirements

### Requirement: File-load mode

The TUI SHALL support a `fileLoad` mode in which the user can type a file path to load a different `.http` file. The mode is entered by pressing `o` and exited by pressing Enter (confirm) or Escape (cancel).

#### Scenario: Pressing o enters file-load mode
- **WHEN** the user presses `o` (lowercase)
- **THEN** the TUI SHALL set `mode` to `'fileLoad'` and display a centered pop-up overlay
- **AND** the overlay SHALL contain a prompt, a text input line, an optional error line, and a hint line
- **AND** all keystrokes SHALL be routed to the text input instead of the normal key handler

#### Scenario: File-load overlay content
- **WHEN** file-load mode is active
- **THEN** the overlay SHALL display:
  - A title: "Open File"
  - A prompt: `File: ` followed by the current input text and a cursor character `_`
  - An inline error message in red when `fileLoadError` is not null
  - A hint: "Enter to load, Esc to cancel"

#### Scenario: Pressing Escape cancels file-load mode
- **WHEN** the user presses Escape while in file-load mode
- **THEN** the TUI SHALL set `mode` back to `'normal'` and clear `fileLoadInput` and `fileLoadError`
- **AND** no state changes to requests, variables, or filePath SHALL occur

### Requirement: File-load text input

While in file-load mode, printable keystrokes SHALL append to `fileLoadInput`, Backspace SHALL delete the last character, and Enter SHALL submit the path for resolution.

#### Scenario: Typing appends to input buffer
- **WHEN** the user presses a printable key while in file-load mode
- **THEN** the key SHALL be appended to `fileLoadInput`

#### Scenario: Backspace deletes last character
- **WHEN** the user presses Backspace while in file-load mode
- **THEN** the last character of `fileLoadInput` SHALL be removed

### Requirement: File loading on Enter

When the user presses Enter in file-load mode, the TUI SHALL resolve the path relative to `process.cwd()`, validate the file exists, read and parse it, and either load the new file or display an inline error.

#### Scenario: Successful file load
- **WHEN** the user presses Enter with a valid path to a `.http` file containing requests
- **THEN** the TUI SHALL read the file, parse it with `parseHttpFile`, and dispatch a `LOAD_FILE` action
- **AND** `requests`, `variables`, and `filePath` SHALL be replaced with the new file's data
- **AND** `selectedIndex` SHALL be preserved if the current request name exists in the new file, otherwise reset to 0
- **AND** `response`, `error`, `responseScrollOffset`, and `requestScrollOffset` SHALL be cleared
- **AND** `mode` SHALL be set back to `'normal'`
- **AND** the status bar SHALL show `"Loaded: {basename}"` for 2 seconds

#### Scenario: File not found
- **WHEN** the user presses Enter with a path that does not exist
- **THEN** the TUI SHALL dispatch a `SET_FILE_LOAD_ERROR` action with message `"File not found: {path}"`
- **AND** the overlay SHALL display the error in red below the input
- **AND** the overlay SHALL remain open with the input preserved so the user can correct the path

#### Scenario: No requests in file
- **WHEN** the user presses Enter with a path to a file that parses but contains zero requests
- **THEN** the TUI SHALL dispatch a `SET_FILE_LOAD_ERROR` action with message `"No requests found in {path}"`
- **AND** the overlay SHALL remain open with the input preserved

#### Scenario: Read or parse error
- **WHEN** the user presses Enter and `readFileSync` or `parseHttpFile` throws
- **THEN** the TUI SHALL dispatch a `SET_FILE_LOAD_ERROR` action with the error message
- **AND** the overlay SHALL remain open with the input preserved
- **AND** the current file state SHALL NOT change

### Requirement: Help overlay includes open-file shortcut

The help overlay SHALL list `o` as the "Open a different file" shortcut.

#### Scenario: Help overlay shows o key
- **WHEN** the help overlay is displayed
- **THEN** it SHALL show `o` with the description "Open a different file"

## MODIFIED Requirements

_(no existing requirements are being modified — only additions)_