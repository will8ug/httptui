# Spec: File Load

## Purpose

Open a different `.http`, `.rest`, Postman collection, or OpenAPI file from within the running TUI, replacing the currently loaded requests, variables, and file path without restarting the application.

## Requirements

### Requirement: Enter file-load mode with the `o` key

Pressing `o` in normal mode SHALL enter file-load mode, displaying the file-load overlay with an empty path input. When the loaded file has unsaved changes, `o` SHALL instead be intercepted by the unsaved-changes confirmation flow (see the **unsaved-changes** spec), and file-load mode SHALL be entered only after that confirmation is accepted.

#### Scenario: Press o to open the file-load overlay
- **WHEN** the application is in normal mode with no unsaved changes and the user presses `o`
- **THEN** file-load mode SHALL be entered and the file-load overlay SHALL be displayed with an empty input

#### Scenario: o is intercepted when there are unsaved changes
- **WHEN** the loaded file has unsaved changes and the user presses `o`
- **THEN** the discard-confirmation prompt SHALL be displayed and the file-load overlay SHALL NOT be displayed until that confirmation is accepted

### Requirement: File-load overlay path input is a single-line editor

The file-load overlay SHALL display the current input value and route all keystrokes to the path input. The path input SHALL behave as a single-line editor: printable characters SHALL be inserted at the cursor, `Backspace` SHALL delete the character before the cursor, `Delete` SHALL delete the character after the cursor, and `←`/`→` SHALL move the cursor one character, clamping at the input bounds. `Home` SHALL move the cursor to the start of the input and `End` SHALL move it to the end, with `Ctrl+A` and `Ctrl+E` as aliases. The cursor SHALL be rendered by inverting the cell at the cursor position, and by inverting a trailing space when the cursor is at the end of the input.

#### Scenario: Typing a character inserts it at the cursor
- **WHEN** the input is `api.http` with the cursor at offset 0 and the user types `x`
- **THEN** the input SHALL become `xapi.http` and the cursor SHALL be at offset 1

#### Scenario: Backspace deletes the character before the cursor
- **WHEN** the input is `api.http` with the cursor at offset 3 and the user presses `Backspace`
- **THEN** the input SHALL become `ap.http` and the cursor SHALL be at offset 2

#### Scenario: Left arrow moves the cursor back one character
- **WHEN** the input is `api.http` with the cursor at offset 3 and the user presses `←`
- **THEN** the cursor SHALL be at offset 2 and the input SHALL be unchanged

#### Scenario: Right arrow moves the cursor forward one character
- **WHEN** the input is `api.http` with the cursor at offset 3 and the user presses `→`
- **THEN** the cursor SHALL be at offset 4 and the input SHALL be unchanged

#### Scenario: Left arrow clamps at the start of the input
- **WHEN** the cursor is at offset 0 and the user presses `←`
- **THEN** the cursor SHALL remain at offset 0

#### Scenario: Right arrow clamps at the end of the input
- **WHEN** the input is `api.http` with the cursor at offset 8 and the user presses `→`
- **THEN** the cursor SHALL remain at offset 8

#### Scenario: Cursor is rendered as an inverted trailing space at the end
- **WHEN** the input is `api.http` with the cursor at offset 8
- **THEN** an inverted space SHALL be rendered after the final `p`

#### Scenario: Delete removes the character after the cursor
- **WHEN** the input is `api.http` with the cursor at offset 0 and the user presses `Delete`
- **THEN** the input SHALL become `pi.http` and the cursor SHALL remain at offset 0

#### Scenario: Delete at the end of the input is a no-op
- **WHEN** the input is `api.http` with the cursor at offset 8 and the user presses `Delete`
- **THEN** the input SHALL remain `api.http` and the cursor SHALL remain at offset 8

#### Scenario: Home moves the cursor to the start of the input
- **WHEN** the input is `api.http` with the cursor at offset 4 and the user presses `Home`
- **THEN** the cursor SHALL be at offset 0 and the input SHALL be unchanged

#### Scenario: End moves the cursor to the end of the input
- **WHEN** the input is `api.http` with the cursor at offset 4 and the user presses `End`
- **THEN** the cursor SHALL be at offset 8 and the input SHALL be unchanged

#### Scenario: Ctrl+A and Ctrl+E alias Home and End
- **WHEN** the input is `api.http` with the cursor at offset 4 and the user presses `Ctrl+A` then `Ctrl+E`
- **THEN** the cursor SHALL move to offset 0 then to offset 8, with no `a` or `e` character inserted

### Requirement: Confirm file load with Enter

Pressing `Enter` SHALL resolve the entered path (a relative path SHALL be resolved against the current working directory), verify that a file exists at that path, read and parse it. On success the system SHALL load the parsed requests and variables, rebind the current file path, return to normal mode, and display a transient confirmation naming the loaded file. On failure the system SHALL display an error in the overlay and SHALL keep the overlay open with the input and cursor preserved.

#### Scenario: Enter loads an existing file
- **WHEN** the user types a path to an existing `.http` file containing requests and presses `Enter`
- **THEN** the requests and variables SHALL be loaded, the current file path SHALL become that path, and the overlay SHALL close

#### Scenario: Enter with a missing file shows an error and stays open
- **WHEN** the user types a path to a file that does not exist and presses `Enter`
- **THEN** an error SHALL be displayed in the overlay and the overlay SHALL remain open with the input preserved

#### Scenario: Enter with a file containing no requests shows an error and stays open
- **WHEN** the user types a path to a file that parses to zero requests and presses `Enter`
- **THEN** an error SHALL be displayed in the overlay and the overlay SHALL remain open with the input preserved

### Requirement: Cancel file load with Escape

Pressing `Escape` while the file-load overlay is open SHALL close the overlay and return to normal mode without changing the loaded requests, variables, or file path.

#### Scenario: Escape closes the overlay
- **WHEN** the file-load overlay is open and the user presses `Escape`
- **THEN** the overlay SHALL close and the loaded file SHALL be unchanged

### Requirement: Tab completes the partial file name against the input's directory segment

Pressing `Tab` in the file-load overlay SHALL complete the partial name against the entries of the directory named by the input up to the last path separator (or the process working directory when the input contains no separator), resolved against the process working directory consistently with Enter. Completion SHALL consider only the input text before the cursor. Entries whose names begin with `.` SHALL be excluded unless the partial name begins with `.`. Entries SHALL NOT be filtered by file extension.

When exactly one entry matches, the partial name SHALL be replaced by the full entry name; when that entry is a directory, a trailing path separator SHALL be appended so completion can be chained downward. When multiple entries match, the partial name SHALL be extended to their longest common prefix; when the longest common prefix equals the partial name, the input SHALL remain unchanged and the matching entry names SHALL be displayed in the overlay with directories marked by a trailing separator. The candidate display SHALL be a single row clipped to the overlay width, indicating the number of hidden entries when the list overflows. When no entries match, the input, cursor, and error state SHALL remain unchanged and no candidate list SHALL be displayed. The displayed candidate list SHALL be cleared by any subsequent edit or cursor movement.

#### Scenario: A single matching file completes in full
- **WHEN** the working directory contains `users.http` and no other entry starting with `use`, the input is `use`, and the user presses `Tab`
- **THEN** the input SHALL become `users.http` with the cursor at the end

#### Scenario: A single matching directory gains a trailing separator
- **WHEN** the working directory contains the directory `admin` and no other entry starting with `a`, the input is `a`, and the user presses `Tab`
- **THEN** the input SHALL become `admin/`

#### Scenario: Completion chains into a completed directory
- **WHEN** the input is `admin/`, the directory `admin` contains only `routes.http`, and the user presses `Tab`
- **THEN** the input SHALL become `admin/routes.http`

#### Scenario: Multiple matches extend to the longest common prefix without listing
- **WHEN** the working directory contains `users.http` and `users-staging.http`, the input is `u`, and the user presses `Tab`
- **THEN** the input SHALL become `users` and no candidate list SHALL be displayed

#### Scenario: Tab with no further progress displays the candidates
- **WHEN** the working directory contains `users.http` and `users-staging.http`, the input is `users`, and the user presses `Tab`
- **THEN** the input SHALL remain `users` and the overlay SHALL display `users.http` and `users-staging.http`

#### Scenario: Directories in the candidate list are marked with a trailing separator
- **WHEN** the working directory contains `admin/`, `assets/`, and `api.http`, the input is `a`, and the user presses `Tab`
- **THEN** the input SHALL remain `a` and the overlay SHALL display the directory candidates as `admin/` and `assets/`

#### Scenario: An overflowing candidate list is clipped with a hidden count
- **WHEN** the combined candidate names exceed the overlay width and the candidate list is displayed
- **THEN** the row SHALL be truncated to the overlay width and SHALL indicate the number of entries not shown

#### Scenario: No matches is a silent no-op
- **WHEN** no entry in the target directory starts with the partial name and the user presses `Tab`
- **THEN** the input and cursor SHALL remain unchanged, no candidate list SHALL be displayed, and no error SHALL be shown

#### Scenario: Typing clears the displayed candidate list
- **WHEN** the candidate list is displayed and the user types a character
- **THEN** the candidate list SHALL no longer be displayed

#### Scenario: Moving the cursor clears the displayed candidate list
- **WHEN** the candidate list is displayed and the user moves the cursor
- **THEN** the candidate list SHALL no longer be displayed

#### Scenario: Dotfiles are excluded from an empty partial name
- **WHEN** the input is `admin/`, the directory `admin` contains only `.env`, and the user presses `Tab`
- **THEN** the input SHALL remain `admin/` and no candidate list SHALL be displayed

#### Scenario: Dotfiles complete when the partial name starts with a dot
- **WHEN** the input is `admin/.`, the directory `admin` contains only `.env`, and the user presses `Tab`
- **THEN** the input SHALL become `admin/.env`

#### Scenario: Completion uses only the text before the cursor
- **WHEN** the working directory contains `users.http` and `users-staging.http`, the input is `usersX` with the cursor after `us`, and the user presses `Tab`
- **THEN** the input SHALL become `usersersX` with the cursor after the inserted `users`
