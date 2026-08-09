# Spec: Request Editing — Delta

## RENAMED Requirements

- FROM: `### Requirement: Enter body edit mode with the \`e\` key`
- TO: `### Requirement: Enter request edit mode with the \`e\` key`

- FROM: `### Requirement: Editor displays raw body text, not resolved text`
- TO: `### Requirement: Editor displays raw request text, not resolved text`

## MODIFIED Requirements

### Requirement: Enter request edit mode with the `e` key

Pressing `e` in normal mode SHALL enter edit mode for the currently selected request. Entering edit mode SHALL set `mode` to `'edit'`, seed one edit buffer per edit target — the URL buffer from the request's raw `url`, and the body buffer from the request's raw `body` value (or the empty string when `body` is `undefined`) — place each buffer's cursor at the end of its buffer, and set `editTarget` to `'url'` so the URL tab is the active tab. The `e` key SHALL have no effect when the application is in any mode other than `'normal'`, where it SHALL be treated as ordinary input by that mode's handler.

#### Scenario: Press e to open the request editor

- **WHEN** the application is in normal mode and the user presses `e`
- **THEN** the edit overlay SHALL be displayed, `mode` SHALL become `'edit'`, and the URL tab SHALL be the active tab

#### Scenario: URL buffer seeded from the request

- **WHEN** the selected request has url `https://{{host}}/users` and the user presses `e`
- **THEN** the URL tab SHALL display `https://{{host}}/users` and the cursor SHALL be positioned after the final `s`

#### Scenario: Body buffer seeded from an existing body

- **WHEN** the selected request has body `{"name":"Alice"}` and the user presses `e` and switches to the body tab
- **THEN** the body tab SHALL display `{"name":"Alice"}` and the cursor SHALL be positioned after the final `}`

#### Scenario: Body buffer seeded as empty for a request with no body

- **WHEN** the selected request has `body` equal to `undefined` and the user presses `e` and switches to the body tab
- **THEN** the body tab SHALL display an empty buffer with the cursor at offset 0

#### Scenario: e is inert outside normal mode

- **WHEN** the application is in `fileLoad` mode and the user presses `e`
- **THEN** the file-load overlay SHALL remain open with `e` appended to its text input, and the edit overlay SHALL NOT be displayed

### Requirement: Editor displays raw request text, not resolved text

The editor SHALL display and operate on the request's raw `url` and `body` strings with all `{{variable}}` placeholders left verbatim. The editor SHALL NOT apply `resolveVariables()` to either buffer. This differs deliberately from the request-details panel, which displays resolved values (see the **request-details** spec).

#### Scenario: Placeholders shown verbatim in the URL tab

- **WHEN** the selected request has url `{{baseUrl}}/users` and the user presses `e`
- **THEN** the URL tab SHALL display `{{baseUrl}}` literally, not a resolved value

#### Scenario: Placeholders shown verbatim in the body tab

- **WHEN** the selected request has body `{"t":"{{$timestamp}}"}` and the user opens the editor and switches to the body tab
- **THEN** the body tab SHALL display `{{$timestamp}}` literally, not a resolved timestamp value

#### Scenario: Committing preserves placeholders

- **WHEN** the user opens the editor on a request whose url contains `{{baseUrl}}`, appends a character elsewhere in the URL buffer, and commits
- **THEN** the stored request url SHALL still contain `{{baseUrl}}` verbatim

### Requirement: Enter inserts a newline

In the body tab, pressing `Enter` in edit mode SHALL insert a newline character at the cursor position and advance the cursor by one. `Enter` SHALL NOT commit or close the editor. The newline SHALL be inserted as `\n`; the carriage return that the terminal transmits SHALL NOT appear in the buffer. In the URL tab, `Enter` SHALL be a no-op (see the single-line URL requirement).

#### Scenario: Enter splits the current line

- **WHEN** the body tab buffer is `abcd` with the cursor at offset 2 and the user presses `Enter`
- **THEN** the buffer SHALL become `ab\ncd` and the cursor SHALL be at offset 3

#### Scenario: Enter does not close the overlay

- **WHEN** the user presses `Enter` while the body tab is active
- **THEN** the editor SHALL remain open and `mode` SHALL remain `'edit'`

#### Scenario: No carriage return is stored

- **WHEN** the user presses `Enter` in an empty body tab buffer
- **THEN** the buffer SHALL contain exactly one `\n` character and SHALL NOT contain `\r`

### Requirement: Commit the edit with Ctrl+S

`Ctrl+S` SHALL commit every tab's buffer to the selected request — the URL buffer to `url` and the body buffer to `body` — close the overlay, and return to normal mode. This commit behavior applies only while the editor is open; in normal mode `Ctrl+S` performs an in-place save of the source file instead (see the **in-place-save** spec). An empty body buffer SHALL be committed as `undefined` rather than as an empty string. The URL buffer SHALL be committed verbatim with no normalization. The committed request SHALL replace the entry at the selected index in `state.requests` without mutating the previous object. When at least one committed value differs from the request's stored value, a transient confirmation message `Request updated` SHALL be displayed and SHALL auto-clear using the existing transient-message mechanism. When every committed value equals the corresponding stored value, no transient confirmation message SHALL be displayed.

#### Scenario: Commit stores the edited URL

- **WHEN** the user opens the editor, changes the URL buffer to `https://staging.example.com/users`, and presses `Ctrl+S`
- **THEN** the selected request's `url` SHALL be `https://staging.example.com/users`, the overlay SHALL close, and `mode` SHALL return to `'normal'`

#### Scenario: Commit stores the edited body

- **WHEN** the user opens the editor, switches to the body tab, changes the buffer to `{"name":"Bob"}`, and presses `Ctrl+S`
- **THEN** the selected request's `body` SHALL be `{"name":"Bob"}`, the overlay SHALL close, and `mode` SHALL return to `'normal'`

#### Scenario: Commit stores edits to both targets at once

- **WHEN** the user edits the URL buffer and the body buffer in one session and presses `Ctrl+S`
- **THEN** the selected request's `url` and `body` SHALL both reflect the edited buffers

#### Scenario: Empty body buffer commits as undefined

- **WHEN** the user deletes all body buffer content and presses `Ctrl+S`
- **THEN** the selected request's `body` SHALL be `undefined`, not the empty string

#### Scenario: Commit shows a transient confirmation

- **WHEN** the user commits an edit in which at least one tab's buffer differs from the stored value
- **THEN** the status bar SHALL display the transient message `Request updated`

#### Scenario: Commit without changes shows no confirmation

- **WHEN** the user presses `Ctrl+S` with every tab's buffer identical to the stored values (or the editor was opened and closed without edits)
- **THEN** the overlay SHALL close, `mode` SHALL return to `'normal'`, and the status bar SHALL NOT display a transient confirmation message

#### Scenario: Committed URL is used by the request-details panel

- **WHEN** the user commits a URL edit and the request-details panel is visible for that request
- **THEN** the panel SHALL display the newly committed URL with variables resolved

#### Scenario: Committed body is used by the request-details panel

- **WHEN** the user commits a body edit and the request-details panel is visible for that request
- **THEN** the panel SHALL display the newly committed body with variables resolved

#### Scenario: Committed URL is exported by save-as

- **WHEN** the user commits a URL edit and then saves with `S`
- **THEN** the written `.http` file SHALL contain the edited URL on the request line

#### Scenario: Committed body is exported by save-as

- **WHEN** the user commits a body edit and then saves with `S`
- **THEN** the written `.http` file SHALL contain the edited body

#### Scenario: Committed URL is written by in-place save

- **WHEN** the user commits a URL edit on a request loaded from a `.http` file and then completes an in-place save with `Ctrl+S` in normal mode
- **THEN** the source file SHALL contain the edited URL on the request line and every other line outside that request's block SHALL be unchanged

#### Scenario: Ctrl+S in normal mode saves in place instead of committing

- **WHEN** the application is in normal mode and the user presses `Ctrl+S`
- **THEN** no edit overlay SHALL open and no edit SHALL be committed
- **AND** the in-place save flow SHALL begin, subject to its confirmation prompt (see the **in-place-save** spec)

### Requirement: Cancel the edit with Escape

`Escape` SHALL close the editor and return to normal mode without applying any tab's buffer to the request. Every tab's in-progress buffer SHALL be discarded with no confirmation prompt, consistent with the cancel behavior of the other overlays.

#### Scenario: Escape discards edits to all tabs

- **WHEN** the user opens the editor, modifies the URL buffer, switches to the body tab, modifies the body buffer, and presses `Escape`
- **THEN** the overlay SHALL close, `mode` SHALL return to `'normal'`, and the selected request's `url` and `body` SHALL be unchanged

#### Scenario: Escape does not prompt

- **WHEN** the user has modified a buffer and presses `Escape`
- **THEN** no confirmation prompt SHALL be displayed

#### Scenario: Reopening after cancel shows the original values

- **WHEN** the user cancels an edit and presses `e` again on the same request
- **THEN** the URL tab SHALL be active and each tab's buffer SHALL be seeded from the unchanged stored values

### Requirement: Form-data request bodies cannot be edited

When the selected request carries `formdataFields`, pressing `e` SHALL still enter edit mode so that the request's URL can be edited. Switching to the body tab SHALL be refused, leaving the previously active tab active, and the system SHALL display a transient message stating that form-data request bodies are not supported for editing, using the existing transient-message mechanism.

#### Scenario: Pressing e on a form-data request opens the editor

- **WHEN** the selected request has `formdataFields` present and the user presses `e`
- **THEN** the edit overlay SHALL be displayed with the URL tab active

#### Scenario: Switching to the body tab is refused with an explanatory message

- **WHEN** the editor is open on a form-data request and the user attempts to switch to the body tab
- **THEN** the URL tab SHALL remain active and the status bar SHALL display a transient message indicating that form-data request bodies are not supported for editing

#### Scenario: URL edit commits on a form-data request

- **WHEN** the user edits the URL buffer of a form-data request and presses `Ctrl+S`
- **THEN** the selected request's `url` SHALL reflect the edited buffer and its unsaved-changes marker SHALL be set

### Requirement: Editor overlay presentation

The editor SHALL render through the existing overlay slot, replacing the panel area while open, and SHALL follow the established overlay styling: a rounded border in `cyanBright`, a bold `cyanBright` title, and a hint line describing the available keys. The overlay SHALL be sized to use most of the available terminal area so that multi-line bodies have room to render. The cursor SHALL be rendered by inverting the character at the cursor position, and by inverting a trailing space when the cursor is at the end of a line. Beneath the title the overlay SHALL render a tab strip listing one label per edit target — `url` and `body` — with the active tab's label visually distinguished from the inactive labels. The title SHALL be target-agnostic; the tab strip SHALL carry the target identity. The hint line SHALL name the tab-switch, commit, and cancel keys.

#### Scenario: Tab strip shows both targets with the active one distinguished

- **WHEN** the editor is open
- **THEN** the tab strip SHALL display the labels `url` and `body`, and the active tab's label SHALL be rendered distinctly from the inactive label

#### Scenario: Overlay uses the shared styling

- **WHEN** the editor is open
- **THEN** it SHALL render a bordered box with a target-agnostic title and a hint line naming `Shift+Tab`, `Ctrl+S`, and `Esc`

#### Scenario: Panels are hidden while editing

- **WHEN** the editor is open
- **THEN** the request list, request details, and response panels SHALL NOT be rendered, and the status bar SHALL remain visible

#### Scenario: Cursor is visible at the end of a line

- **WHEN** the cursor is positioned at the end of a line
- **THEN** an inverted space SHALL be rendered at that position

## ADDED Requirements

### Requirement: Switch edit target with Shift+Tab

In edit mode, `Shift+Tab` SHALL activate the next tab in tab-strip order, wrapping to the first tab after the last. Each tab's buffer and cursor SHALL be preserved across switches for the duration of the editing session, so switching never loses an in-progress edit. After a switch, the newly active tab SHALL render its own buffer and cursor, and the scroll offsets SHALL be adjusted so the restored cursor is within the visible region.

#### Scenario: Shift+Tab switches from the URL tab to the body tab

- **WHEN** the editor is open with the URL tab active and the user presses `Shift+Tab`
- **THEN** the body tab SHALL become active and its buffer and cursor SHALL be displayed

#### Scenario: Switching preserves in-progress edits

- **WHEN** the user modifies the URL buffer, switches to the body tab, modifies the body buffer, and switches back to the URL tab
- **THEN** the URL buffer SHALL contain the earlier modifications with the cursor where the user left it

#### Scenario: Shift+Tab wraps from the last tab to the first

- **WHEN** the body tab is active and the user presses `Shift+Tab`
- **THEN** the URL tab SHALL become active

### Requirement: The URL tab is a single-line editor

While the URL tab is active, the editor SHALL NOT admit newline characters into the buffer: `Enter` SHALL be a no-op, and newline characters contained in pasted or other multi-character input SHALL be stripped before insertion. The body tab SHALL continue to accept newlines (see the newline requirement above).

#### Scenario: Enter is a no-op in the URL tab

- **WHEN** the URL tab is active and the user presses `Enter`
- **THEN** the URL buffer and cursor SHALL be unchanged and the editor SHALL remain open

#### Scenario: Pasted newlines are stripped in the URL tab

- **WHEN** the URL tab is active and an input string containing `https://a.com` followed by a newline followed by `/x` is received
- **THEN** the URL buffer SHALL contain `https://a.com/x` with no newline character

#### Scenario: Enter still inserts a newline in the body tab

- **WHEN** the body tab is active and the user presses `Enter`
- **THEN** a newline SHALL be inserted into the body buffer at the cursor position
