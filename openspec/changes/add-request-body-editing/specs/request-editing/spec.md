## ADDED Requirements

### Requirement: Enter body edit mode with the `e` key

Pressing `e` in normal mode SHALL enter edit mode for the currently selected request's body. Entering edit mode SHALL set `mode` to `'edit'`, set `editTarget` to `'body'`, seed the edit buffer with the selected request's raw `body` value (or the empty string when `body` is `undefined`), and place the cursor at the end of the buffer. The `e` key SHALL have no effect when the application is in any mode other than `'normal'`, where it SHALL be treated as ordinary input by that mode's handler.

#### Scenario: Press e to open the body editor

- **WHEN** the application is in normal mode and the user presses `e`
- **THEN** the body edit overlay SHALL be displayed and `mode` SHALL become `'edit'` with `editTarget` equal to `'body'`

#### Scenario: Buffer seeded from an existing body

- **WHEN** the selected request has body `{"name":"Alice"}` and the user presses `e`
- **THEN** the overlay SHALL display `{"name":"Alice"}` and the cursor SHALL be positioned after the final `}`

#### Scenario: Buffer seeded as empty for a request with no body

- **WHEN** the selected request has `body` equal to `undefined` and the user presses `e`
- **THEN** the overlay SHALL be displayed with an empty buffer and the cursor at offset 0

#### Scenario: e is inert outside normal mode

- **WHEN** the application is in `fileLoad` mode and the user presses `e`
- **THEN** the file-load overlay SHALL remain open with `e` appended to its text input, and the body edit overlay SHALL NOT be displayed

### Requirement: Editor displays raw body text, not resolved text

The body editor SHALL display and operate on the request's raw `body` string with all `{{variable}}` placeholders left verbatim. The editor SHALL NOT apply `resolveVariables()` to the buffer. This differs deliberately from the request-details panel, which displays the resolved body (see the **request-details** spec).

#### Scenario: Placeholders shown verbatim in the editor

- **WHEN** the selected request has body `{"t":"{{$timestamp}}"}` and the user presses `e`
- **THEN** the overlay SHALL display `{{$timestamp}}` literally, not a resolved timestamp value

#### Scenario: Committing preserves placeholders

- **WHEN** the user opens the editor on a body containing `{{baseUrl}}`, appends a character elsewhere in the buffer, and commits
- **THEN** the stored request body SHALL still contain `{{baseUrl}}` verbatim

### Requirement: Insert printable characters at the cursor

Printable input received while in edit mode SHALL be inserted into the buffer at the cursor position, and the cursor SHALL advance by the number of characters inserted. Input received together with the `ctrl` or `meta` modifier SHALL NOT be inserted.

#### Scenario: Typing a character mid-buffer

- **WHEN** the buffer is `abc` with the cursor at offset 1 and the user types `X`
- **THEN** the buffer SHALL become `aXbc` and the cursor SHALL be at offset 2

#### Scenario: Typing at the end of the buffer

- **WHEN** the buffer is `abc` with the cursor at offset 3 and the user types `d`
- **THEN** the buffer SHALL become `abcd` and the cursor SHALL be at offset 4

#### Scenario: Multi-character input is inserted as a unit

- **WHEN** the buffer is empty and a multi-character input string `hello` is received
- **THEN** the buffer SHALL become `hello` and the cursor SHALL be at offset 5

### Requirement: Enter inserts a newline

Pressing `Enter` in edit mode SHALL insert a newline character at the cursor position and advance the cursor by one. `Enter` SHALL NOT commit or close the editor. The newline SHALL be inserted as `\n`; the carriage return that the terminal transmits SHALL NOT appear in the buffer.

#### Scenario: Enter splits the current line

- **WHEN** the buffer is `abcd` with the cursor at offset 2 and the user presses `Enter`
- **THEN** the buffer SHALL become `ab\ncd` and the cursor SHALL be at offset 3

#### Scenario: Enter does not close the overlay

- **WHEN** the user presses `Enter` while the body editor is open
- **THEN** the body editor SHALL remain open and `mode` SHALL remain `'edit'`

#### Scenario: No carriage return is stored

- **WHEN** the user presses `Enter` in an empty buffer
- **THEN** the buffer SHALL contain exactly one `\n` character and SHALL NOT contain `\r`

### Requirement: Delete characters with Backspace and Delete

`Backspace` SHALL remove the character immediately before the cursor and move the cursor back by one. `Delete` SHALL remove the character immediately after the cursor and leave the cursor unchanged. Both SHALL be no-ops at their respective buffer boundaries. Both SHALL delete a newline character like any other character, thereby joining two lines.

#### Scenario: Backspace removes the preceding character

- **WHEN** the buffer is `abc` with the cursor at offset 2 and the user presses `Backspace`
- **THEN** the buffer SHALL become `ac` and the cursor SHALL be at offset 1

#### Scenario: Backspace at the start of the buffer is a no-op

- **WHEN** the buffer is `abc` with the cursor at offset 0 and the user presses `Backspace`
- **THEN** the buffer SHALL remain `abc` and the cursor SHALL remain at offset 0

#### Scenario: Backspace at the start of a line joins it to the previous line

- **WHEN** the buffer is `ab\ncd` with the cursor at offset 3 and the user presses `Backspace`
- **THEN** the buffer SHALL become `abcd` and the cursor SHALL be at offset 2

#### Scenario: Delete removes the following character

- **WHEN** the buffer is `abc` with the cursor at offset 1 and the user presses `Delete`
- **THEN** the buffer SHALL become `ac` and the cursor SHALL remain at offset 1

#### Scenario: Delete at the end of the buffer is a no-op

- **WHEN** the buffer is `abc` with the cursor at offset 3 and the user presses `Delete`
- **THEN** the buffer SHALL remain `abc` and the cursor SHALL remain at offset 3

### Requirement: Horizontal cursor movement

`←` SHALL move the cursor back one character and `→` SHALL move it forward one character. Both SHALL clamp at the buffer boundaries. Movement SHALL traverse newline characters, so moving left from the start of a line places the cursor at the end of the previous line.

#### Scenario: Left arrow moves back one character

- **WHEN** the buffer is `abc` with the cursor at offset 2 and the user presses `←`
- **THEN** the cursor SHALL be at offset 1 and the buffer SHALL be unchanged

#### Scenario: Left arrow clamps at offset zero

- **WHEN** the cursor is at offset 0 and the user presses `←`
- **THEN** the cursor SHALL remain at offset 0

#### Scenario: Right arrow clamps at the end of the buffer

- **WHEN** the buffer is `abc` with the cursor at offset 3 and the user presses `→`
- **THEN** the cursor SHALL remain at offset 3

#### Scenario: Left arrow crosses a line boundary

- **WHEN** the buffer is `ab\ncd` with the cursor at offset 3 and the user presses `←`
- **THEN** the cursor SHALL be at offset 2, which is the end of the first line

### Requirement: Vertical cursor movement

`↑` SHALL move the cursor to the same column on the previous line and `↓` SHALL move it to the same column on the next line. When the target line is shorter than the current column, the cursor SHALL be placed at the end of the target line. `↑` on the first line and `↓` on the last line SHALL leave the cursor unchanged.

#### Scenario: Down arrow preserves the column

- **WHEN** the buffer is `abcd\nefgh` with the cursor at line 0 column 2 and the user presses `↓`
- **THEN** the cursor SHALL be at line 1 column 2

#### Scenario: Down arrow clamps to a shorter target line

- **WHEN** the buffer is `abcdef\ngh` with the cursor at line 0 column 5 and the user presses `↓`
- **THEN** the cursor SHALL be at line 1 column 2, which is the end of the second line

#### Scenario: Up arrow on the first line is a no-op

- **WHEN** the cursor is on line 0 and the user presses `↑`
- **THEN** the cursor SHALL remain at its current offset

#### Scenario: Down arrow on the last line is a no-op

- **WHEN** the cursor is on the final line and the user presses `↓`
- **THEN** the cursor SHALL remain at its current offset

### Requirement: Jump to line start and line end

`Home` SHALL move the cursor to the first column of the current line and `End` SHALL move it to the last column of the current line. `Ctrl+A` SHALL be an alias for `Home` and `Ctrl+E` SHALL be an alias for `End`, so the behavior remains reachable on terminals that do not transmit `Home` and `End`.

#### Scenario: Home moves to the start of the current line

- **WHEN** the buffer is `ab\ncdef` with the cursor at line 1 column 3 and the user presses `Home`
- **THEN** the cursor SHALL be at line 1 column 0

#### Scenario: End moves to the end of the current line

- **WHEN** the buffer is `ab\ncdef` with the cursor at line 1 column 1 and the user presses `End`
- **THEN** the cursor SHALL be at line 1 column 4

#### Scenario: Ctrl+A behaves as Home

- **WHEN** the cursor is mid-line and the user presses `Ctrl+A`
- **THEN** the cursor SHALL move to the first column of that line and no `a` character SHALL be inserted

#### Scenario: Ctrl+E behaves as End

- **WHEN** the cursor is mid-line and the user presses `Ctrl+E`
- **THEN** the cursor SHALL move to the last column of that line and no `e` character SHALL be inserted

### Requirement: Viewport follows the cursor

The editor SHALL display a slice of the buffer's lines bounded by the overlay's visible height, and SHALL adjust the vertical scroll offset so that the cursor's line is always within the visible slice. The editor SHALL likewise adjust a horizontal offset so that the cursor's visual column is always within the visible width. Content outside the visible region SHALL NOT render beyond the overlay's borders.

#### Scenario: Scrolling down to keep the cursor visible

- **WHEN** the buffer has more lines than the overlay can display and the user moves the cursor below the last visible line
- **THEN** the vertical scroll offset SHALL increase so the cursor's line is rendered within the overlay

#### Scenario: Scrolling up to keep the cursor visible

- **WHEN** the vertical scroll offset is non-zero and the user moves the cursor above the first visible line
- **THEN** the vertical scroll offset SHALL decrease so the cursor's line is rendered within the overlay

#### Scenario: Horizontal offset follows a long line

- **WHEN** the cursor is moved past the visible width on a line longer than the overlay's content width
- **THEN** the horizontal offset SHALL increase so the cursor's column is rendered within the overlay

#### Scenario: No overflow outside the overlay

- **WHEN** the buffer contains lines longer than the overlay's content width
- **THEN** each rendered line SHALL be truncated to the content width and no text SHALL render outside the overlay border

### Requirement: Tab characters are expanded for display

The editor SHALL expand tab characters to spaces for rendering, advancing to the next multiple of eight columns, matching the request-details panel's behavior. Expansion SHALL apply to display only; the buffer SHALL retain the literal tab characters, and insertion and deletion SHALL operate on the unexpanded text. The cursor's rendered column SHALL be computed from the expanded width of the text preceding it on its line.

#### Scenario: Tab-indented line renders within bounds

- **WHEN** the buffer contains a line beginning with four tab characters
- **THEN** the rendered line SHALL show 32 columns of indentation and SHALL NOT overflow the overlay border

#### Scenario: Buffer retains literal tabs

- **WHEN** a buffer containing tab characters is committed
- **THEN** the stored request body SHALL contain the original tab characters, not spaces

#### Scenario: Cursor renders at the expanded column

- **WHEN** the cursor is positioned immediately after a single leading tab character
- **THEN** the cursor SHALL be rendered at visual column 8

### Requirement: Commit the edit with Ctrl+S

`Ctrl+S` SHALL commit the buffer to the selected request's `body`, close the overlay, and return to normal mode. An empty buffer SHALL be committed as `undefined` rather than as an empty string. The committed request SHALL replace the entry at the selected index in `state.requests` without mutating the previous object. A transient confirmation message SHALL be displayed and SHALL auto-clear using the existing transient-message mechanism.

#### Scenario: Commit stores the edited body

- **WHEN** the user opens the editor, changes the buffer to `{"name":"Bob"}`, and presses `Ctrl+S`
- **THEN** the selected request's `body` SHALL be `{"name":"Bob"}`, the overlay SHALL close, and `mode` SHALL return to `'normal'`

#### Scenario: Empty buffer commits as undefined

- **WHEN** the user deletes all buffer content and presses `Ctrl+S`
- **THEN** the selected request's `body` SHALL be `undefined`, not the empty string

#### Scenario: Commit shows a transient confirmation

- **WHEN** the user commits an edit
- **THEN** the status bar SHALL display a transient confirmation message

#### Scenario: Committed body is used by the request-details panel

- **WHEN** the user commits a body edit and the request-details panel is visible for that request
- **THEN** the panel SHALL display the newly committed body with variables resolved

#### Scenario: Committed body is exported by save

- **WHEN** the user commits a body edit and then saves with `S`
- **THEN** the written `.http` file SHALL contain the edited body

### Requirement: Cancel the edit with Escape

`Escape` SHALL close the editor and return to normal mode without applying the buffer to the request. The in-progress buffer SHALL be discarded with no confirmation prompt, consistent with the cancel behavior of the other overlays.

#### Scenario: Escape discards the buffer

- **WHEN** the user opens the editor, types additional characters, and presses `Escape`
- **THEN** the overlay SHALL close, `mode` SHALL return to `'normal'`, and the selected request's `body` SHALL be unchanged

#### Scenario: Escape does not prompt

- **WHEN** the user has modified the buffer and presses `Escape`
- **THEN** no confirmation prompt SHALL be displayed

#### Scenario: Reopening after cancel shows the original body

- **WHEN** the user cancels an edit and presses `e` again on the same request
- **THEN** the buffer SHALL be seeded from the unchanged stored body

### Requirement: Form-data request bodies cannot be edited

When the selected request carries `formdataFields`, pressing `e` SHALL NOT enter edit mode. The system SHALL instead display a transient message stating that form-data request bodies are not supported for editing, using the existing transient-message mechanism.

#### Scenario: Pressing e on a form-data request is blocked

- **WHEN** the selected request has `formdataFields` present and the user presses `e`
- **THEN** the body edit overlay SHALL NOT be displayed and `mode` SHALL remain `'normal'`

#### Scenario: Blocked edit shows an explanatory message

- **WHEN** the user presses `e` on a form-data request
- **THEN** the status bar SHALL display a transient message indicating that form-data request bodies are not supported for editing

### Requirement: Editor overlay presentation

The body editor SHALL render through the existing overlay slot, replacing the panel area while open, and SHALL follow the established overlay styling: a rounded border in `cyanBright`, a bold `cyanBright` title, and a hint line describing the available keys. The overlay SHALL be sized to use most of the available terminal area so that multi-line bodies have room to render. The cursor SHALL be rendered by inverting the character at the cursor position, and by inverting a trailing space when the cursor is at the end of a line.

#### Scenario: Overlay uses the shared styling

- **WHEN** the body editor is open
- **THEN** it SHALL render a bordered box with a title identifying the edit target and a hint line describing the commit and cancel keys

#### Scenario: Panels are hidden while editing

- **WHEN** the body editor is open
- **THEN** the request list, request details, and response panels SHALL NOT be rendered, and the status bar SHALL remain visible

#### Scenario: Cursor is visible at the end of a line

- **WHEN** the cursor is positioned at the end of a line
- **THEN** an inverted space SHALL be rendered at that position
