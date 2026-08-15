## Purpose

Handing the terminal to the user's external editor so the whole source file can be edited — including content that lies outside any single request, such as file variables, comments, request names, and the set of requests itself — and reloading the file when the editor exits.

## ADDED Requirements

### Requirement: Open the source file in an external editor with Ctrl+G

Pressing `Ctrl+G` in normal mode SHALL begin an external editor handoff for the file at the current source file path. The handoff SHALL be subject to the source-format gate below and, when unsaved changes exist, to the confirmation prompt described in the **unsaved-changes** spec. `Ctrl+G` SHALL begin a handoff only in normal mode; in any other mode (`fileLoad`, `search`, `envSelect`, `saveLoad`, `edit`, `confirmDiscard`, `confirmInPlaceSave`) it SHALL be treated as ordinary input by that mode's handler and SHALL NOT begin a handoff.

The editor SHALL be given the source file itself, not a copy. Content the parser does not retain — comments, blank lines, and the original formatting of unedited requests — SHALL therefore survive the handoff untouched.

#### Scenario: Ctrl+G in normal mode begins the handoff

- **WHEN** the application is in normal mode with an http-format source, no unsaved changes, and the user presses `Ctrl+G`
- **THEN** the external editor SHALL be launched on the current source file path

#### Scenario: Ctrl+G in the request editor does not begin a handoff

- **WHEN** the request editor is open and the user presses `Ctrl+G`
- **THEN** no editor SHALL be launched and the editor overlay SHALL remain open

#### Scenario: Ctrl+G in the file-load overlay is inert

- **WHEN** the file-load overlay is open and the user presses `Ctrl+G`
- **THEN** no editor SHALL be launched and the overlay SHALL remain open

#### Scenario: Comments and formatting survive the handoff

- **WHEN** the source file contains comment lines and a request block with non-canonical header spacing, and the user completes a handoff having changed an unrelated line
- **THEN** the comment lines and the non-canonical spacing SHALL remain in the file unchanged

### Requirement: External editor handoff requires an http-format source

When the loaded source is not an http-format file — that is, `detectFormat` returns `'postman'` or `'openapi'` — pressing `Ctrl+G` SHALL NOT launch any editor and SHALL display a transient message stating that the external editor handoff is only available for `.http` files. The message SHALL NOT direct the user to another command, because no command converts a Postman or OpenAPI source into an editable `.http` source in place.

#### Scenario: Postman source is refused

- **WHEN** the loaded file is a Postman collection and the user presses `Ctrl+G`
- **THEN** no editor SHALL be launched
- **AND** a transient message SHALL be displayed stating the handoff is only available for `.http` files

#### Scenario: OpenAPI source is refused

- **WHEN** the loaded file is an OpenAPI spec and the user presses `Ctrl+G`
- **THEN** no editor SHALL be launched
- **AND** a transient message SHALL be displayed stating the handoff is only available for `.http` files

#### Scenario: http source proceeds

- **WHEN** the loaded file is `api.http` and the user presses `Ctrl+G`
- **THEN** the system SHALL proceed with the handoff

### Requirement: Editor command resolution

The system SHALL resolve the editor command from the `VISUAL` environment variable, falling back to the `EDITOR` environment variable, falling back to a platform default editor when neither is set. The resolved command SHALL be launched with the source file path as its argument.

#### Scenario: VISUAL takes precedence over EDITOR

- **WHEN** both `VISUAL` and `EDITOR` are set and the user begins a handoff
- **THEN** the command named by `VISUAL` SHALL be launched

#### Scenario: EDITOR is used when VISUAL is unset

- **WHEN** `VISUAL` is unset, `EDITOR` is set, and the user begins a handoff
- **THEN** the command named by `EDITOR` SHALL be launched

#### Scenario: A default editor is used when neither variable is set

- **WHEN** neither `VISUAL` nor `EDITOR` is set and the user begins a handoff
- **THEN** a platform default editor SHALL be launched

### Requirement: The TUI releases the terminal while the editor runs

Before the editor is launched, the system SHALL release the terminal so the editor has sole control of it: the alternate screen SHALL be exited, the cursor SHALL be made visible, and the terminal SHALL be returned to its normal input mode so the editor receives keystrokes directly. While the editor is running, the TUI SHALL NOT draw to the terminal.

When the editor exits, the system SHALL reclaim the terminal, re-enter the alternate screen, and repaint its entire interface rather than only the regions it believes changed, because the editor may have overwritten any part of the screen.

#### Scenario: The editor receives an uncontested terminal

- **WHEN** the external editor is running
- **THEN** the TUI SHALL NOT write to the terminal and the editor SHALL render without interference

#### Scenario: The interface is fully repainted after the editor exits

- **WHEN** the external editor exits after having drawn over the whole screen
- **THEN** the TUI SHALL re-enter the alternate screen and repaint every panel, leaving no residue of the editor's output

#### Scenario: Keyboard input returns to the TUI after the editor exits

- **WHEN** the external editor has exited and the interface has been restored
- **THEN** normal-mode key handling SHALL resume

### Requirement: The editor's exit status does not affect the outcome

The system SHALL ignore the exit status of an editor that ran to completion, and SHALL decide what to do solely from whether the source file was modified. An editor that exits with a non-zero status after saving SHALL therefore have its changes loaded, and an editor that exits successfully without saving SHALL leave the session unchanged.

#### Scenario: A non-zero exit after saving still loads the changes

- **WHEN** the user modifies and saves the file, then quits the editor in a way that returns a non-zero exit status
- **THEN** the saved changes SHALL be loaded

#### Scenario: A zero exit without saving changes nothing

- **WHEN** the user quits the editor without saving and the editor returns a zero exit status
- **THEN** the loaded requests SHALL be unchanged

### Requirement: A failure to launch the editor leaves the session unchanged

When the editor cannot be launched at all — for example the resolved command does not exist — the system SHALL display a transient error message, SHALL leave the loaded requests, the current response, and every unsaved-changes marker untouched, and SHALL return to normal mode. This is distinct from an editor that ran and failed, which is covered by the exit-status requirement above.

#### Scenario: A missing editor command reports an error and changes nothing

- **WHEN** the resolved editor command does not exist on the system and the user begins a handoff
- **THEN** a transient error message SHALL be displayed
- **AND** the loaded requests SHALL be unchanged and the application SHALL be in normal mode

### Requirement: An unmodified source file is not reloaded

On return from the editor, the system SHALL compare the source file's last-modification time against the value recorded before the editor was launched. When the timestamp is unchanged, the system SHALL NOT reload the file, SHALL NOT display a confirmation message, and SHALL leave the selected request, the current response, and every unsaved-changes marker untouched.

Saving the file updates its timestamp even when the content is identical, so a save-then-quit SHALL be treated as a modification and SHALL reload; reloading identical content is harmless.

#### Scenario: Quitting without saving is a silent no-op

- **WHEN** the user opens the editor and quits without saving
- **THEN** no reload SHALL occur, no transient message SHALL be displayed, and the selected request SHALL be unchanged

#### Scenario: Unsaved changes survive a handoff that changed nothing

- **WHEN** a request is marked with unsaved changes, the user confirms the discard prompt, and then quits the editor without saving
- **THEN** no reload SHALL occur and the request's unsaved-changes marker SHALL remain set

#### Scenario: Saving without editing still reloads

- **WHEN** the user saves the file without altering its content and quits the editor
- **THEN** the file SHALL be reloaded and the loaded requests SHALL be equivalent to those loaded before the handoff

### Requirement: A modified source file is reloaded

When the source file's last-modification time has changed and the file parses to at least one request, the system SHALL reload it. The reload SHALL follow the semantics already defined for reloading the current file in the **file-reload** spec, including preserving the selection when the selected request's name still exists, resetting the selection otherwise, and displaying a transient confirmation.

#### Scenario: A request added in the editor appears in the request list

- **WHEN** the user adds a new request block in the editor, saves, and quits
- **THEN** the new request SHALL appear in the request list

#### Scenario: An edited file variable takes effect

- **WHEN** the user changes a file variable's value in the editor, saves, and quits
- **THEN** requests referencing that variable SHALL resolve using the new value

#### Scenario: The selected request is preserved by name

- **WHEN** the user edits a request other than the selected one, saves, and quits
- **THEN** the previously selected request SHALL remain selected

### Requirement: An unparseable edited file preserves the loaded requests

When the source file has been modified but cannot be read or parsed on return from the editor, the system SHALL display a transient error message and SHALL preserve the loaded requests, their unsaved-changes markers, the current response, and the search state, exactly as specified for a failed reload in the **file-reload** spec. The system SHALL NOT clear the request list.

#### Scenario: A syntax error keeps the previous requests

- **WHEN** the user saves a file the parser cannot read and quits the editor
- **THEN** a transient error message SHALL be displayed
- **AND** the request list SHALL still contain the requests loaded before the handoff

#### Scenario: A failed reload preserves the current response

- **WHEN** a response is displayed, and the user saves an unparseable file and quits the editor
- **THEN** the current response SHALL remain displayed

### Requirement: An edited file with no requests is refused

When the source file has been modified and parses successfully but contains no requests, the system SHALL NOT replace the loaded requests. It SHALL display a transient message reporting that no requests were found in the file, and SHALL leave the previously loaded requests, the selected request, and the unsaved-changes markers in place. This matches the refusal already applied when a file containing no requests is opened from the file-load overlay (see the **file-load** spec) and keeps the application out of a state with an empty request list.

#### Scenario: Deleting every request is refused

- **WHEN** the user deletes every request from the file, saves, and quits the editor
- **THEN** a transient message SHALL report that no requests were found
- **AND** the request list SHALL still contain the requests loaded before the handoff

#### Scenario: The selection survives a refused reload

- **WHEN** an editor handoff is refused because the edited file contains no requests
- **THEN** the previously selected request SHALL remain selected
