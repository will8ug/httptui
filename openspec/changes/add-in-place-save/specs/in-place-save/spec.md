# Spec: In-place Save

## Purpose

Writing edited requests back to the source `.http`/`.rest` file via `Ctrl+S` in normal mode: surgical block replacement of only the requests marked as changed in memory (per-request `isDirty`), source-format gating, overwrite semantics, line-ending preservation, and the guards against separator lines in edited bodies and structural source changes.

## ADDED Requirements

### Requirement: Enter in-place save with Ctrl+S in normal mode

Pressing `Ctrl+S` in normal mode SHALL begin the in-place save flow for the source file at `state.filePath`. The flow SHALL write to the file only after a confirmation prompt is accepted (see the **Confirm before overwriting the source file** requirement). `Ctrl+S` SHALL begin the flow only in normal mode; while the body editor is open it SHALL commit the edit buffer (see the **request-editing** spec); in any other mode (`fileLoad`, `search`, `envSelect`, `saveLoad`, `edit`, `confirmDiscard`, `confirmInPlaceSave`) it SHALL NOT begin an in-place save.

#### Scenario: Ctrl+S in normal mode begins the in-place save flow

- **WHEN** the application is in normal mode, the source is http-format, at least one request is marked, and the user presses `Ctrl+S`
- **THEN** a confirmation prompt SHALL be displayed and no file SHALL be written yet

#### Scenario: Ctrl+S in the body editor commits instead of saving

- **WHEN** the body editor is open and the user presses `Ctrl+S`
- **THEN** the edit buffer SHALL be committed to the selected request and no file SHALL be written

#### Scenario: Ctrl+S in the file-load overlay is inert

- **WHEN** the file-load overlay is open and the user presses `Ctrl+S`
- **THEN** the in-place save SHALL NOT begin and the overlay SHALL remain open

### Requirement: In-place save requires an http-format source

When the loaded source is not an http-format file — that is, `detectFormat` returns `'postman'` or `'openapi'` — pressing `Ctrl+S` SHALL NOT write any file and SHALL display a transient message stating that in-place save is only available for `.http` files and pointing at the `S` save-as shortcut.

#### Scenario: Postman source is refused with a hint

- **WHEN** the loaded file is a Postman collection and the user presses `Ctrl+S`
- **THEN** no file SHALL be written
- **AND** a transient message SHALL be displayed referencing the save-as shortcut

#### Scenario: OpenAPI source is refused with a hint

- **WHEN** the loaded file is an OpenAPI spec and the user presses `Ctrl+S`
- **THEN** no file SHALL be written
- **AND** a transient message SHALL be displayed referencing the save-as shortcut

#### Scenario: .http source proceeds

- **WHEN** the loaded file is `api.http` and the user presses `Ctrl+S`
- **THEN** the system SHALL proceed with the in-place save

### Requirement: In-place save overwrites the source file

The in-place save SHALL write to `state.filePath`, overwriting any content already at that path, without applying the save-as conflict refusal (see the **save-as-http** spec). The current file path SHALL remain unchanged after the write.

#### Scenario: Existing source file is overwritten

- **WHEN** the source file `api.http` exists at `state.filePath` and the user confirms the in-place save prompt
- **THEN** the file SHALL be overwritten with the new content

#### Scenario: File path is unchanged after an in-place save

- **WHEN** the user completes an in-place save to `api.http`
- **THEN** `state.filePath` SHALL remain `api.http` and the status bar SHALL continue to show `api.http`

### Requirement: Confirm before overwriting the source file

When the user presses `Ctrl+S` on an http-format source with at least one marked request, the system SHALL display a confirmation prompt before writing any file. The prompt SHALL name the source file and the number of marked requests. `y` SHALL proceed with the in-place save; `n` or `Escape` SHALL cancel it without writing and without changing any request's marker. Keys other than `y`, `n`, and `Escape` SHALL be ignored while the prompt is displayed.

#### Scenario: Confirming with y writes the file

- **WHEN** the confirmation prompt is displayed and the user presses `y`
- **THEN** the in-place save SHALL be performed and the file SHALL be overwritten

#### Scenario: Declining with n cancels without writing

- **WHEN** the confirmation prompt is displayed and the user presses `n`
- **THEN** no file SHALL be written, every request's marker SHALL remain set, and the application SHALL return to normal mode

#### Scenario: Declining with Escape cancels without writing

- **WHEN** the confirmation prompt is displayed and the user presses `Escape`
- **THEN** no file SHALL be written, every request's marker SHALL remain set, and the application SHALL return to normal mode

#### Scenario: Unrelated keys are ignored while confirming

- **WHEN** the confirmation prompt is displayed and the user presses `v`
- **THEN** the prompt SHALL remain displayed and verbose mode SHALL NOT toggle

#### Scenario: No confirmation when nothing is marked

- **WHEN** the user presses `Ctrl+S` with no request marked
- **THEN** no confirmation prompt SHALL be displayed and no file SHALL be written
- **AND** a transient `No changes to save` message SHALL be displayed

#### Scenario: No confirmation for a non-http source

- **WHEN** the user presses `Ctrl+S` on a Postman or OpenAPI source
- **THEN** the hint message SHALL be displayed and no confirmation prompt SHALL be shown

### Requirement: Only marked request blocks are rewritten

The in-place save SHALL rewrite only the blocks of requests whose `isDirty` marker is set (see the **unsaved-changes** spec). The source file SHALL be re-read and re-parsed to locate each marked request's block in the current on-disk content. Content outside a rewritten block — comments, variables, blank lines, and unmarked requests — SHALL remain byte-identical. When no request's marker is set, the system SHALL NOT write any file, SHALL NOT display the confirmation prompt, and SHALL display a transient `No changes to save` message.

#### Scenario: Editing one of several requests rewrites only that block

- **WHEN** a source file contains three requests, the user edits only the second request's body (its `isDirty` marker is set), and presses `Ctrl+S`
- **THEN** only the second request's block SHALL be rewritten
- **AND** the first and third request blocks, comments, and variables SHALL be byte-identical

#### Scenario: A form-data request is never rewritten

- **WHEN** a source file contains a form-data request and the user edits a different request's body and presses `Ctrl+S`
- **THEN** the form-data request's block SHALL remain byte-identical (form-data requests cannot be edited, so their marker is never set; see the **request-editing** spec)

#### Scenario: No marked requests produce no write

- **WHEN** the user presses `Ctrl+S` and no request's `isDirty` marker is set
- **THEN** the system SHALL NOT write any file and SHALL NOT display the confirmation prompt
- **AND** the system SHALL display a transient `No changes to save` message

#### Scenario: A request reverted to its original body is still rewritten

- **WHEN** the user edits a request's body and then reverts it to its value at load time (its marker remains set per the **unsaved-changes** spec) and presses `Ctrl+S`
- **THEN** the request's block SHALL be rewritten in canonical form
- **AND** the request's marker SHALL be cleared by the successful save

#### Scenario: An externally changed unmarked request is preserved

- **WHEN** the source file on disk is changed outside the app for a request whose `isDirty` marker is unset, and the user saves a different request in place
- **THEN** the externally changed block SHALL remain byte-identical

#### Scenario: An edited block is regenerated in canonical form

- **WHEN** an edited request's source block has header spacing like `Content-Type:application/json` and the user saves in place
- **THEN** the rewritten block SHALL contain the normalized form `Content-Type: application/json`

### Requirement: Rewritten blocks always carry a ### name separator

A rewritten block SHALL begin with a `### <name>` separator line using the request's stored name. A request whose source block had no separator — possible only for the first request in the file — SHALL gain the separator, and comments above that request SHALL remain unchanged because they lie outside the rewritten region. A bare `###` separator SHALL be normalized to `### Request N`.

#### Scenario: Named separator is preserved

- **WHEN** the source block begins with `### Get Users` and the user saves an edit in place
- **THEN** the rewritten block SHALL begin with `### Get Users`

#### Scenario: A separator-less first request gains a separator

- **WHEN** the source file begins directly with `GET https://api.example.com/users` (no `###` line) and the user edits its body and saves in place
- **THEN** the rewritten block SHALL begin with `### Request 1`

#### Scenario: Comments above a separator-less first request survive

- **WHEN** the source file begins with a `#` comment line followed directly by a request line with no separator, and the user saves an edit in place
- **THEN** the comment line SHALL remain in the file unchanged

#### Scenario: A bare separator is normalized

- **WHEN** the source block begins with a bare `###` line (no name) and the user saves an edit in place
- **THEN** the rewritten block SHALL begin with `### Request N` where `N` matches the request's auto-generated name

### Requirement: Preserve the source file's line-ending convention

The rewritten block SHALL use the source file's line-ending convention: LF when the source contains no `\r\n`, CRLF when it does. Content outside the rewritten block SHALL keep its original line endings byte-for-byte, so a save SHALL NOT introduce mixed line endings.

#### Scenario: LF source stays LF

- **WHEN** the source file uses LF line endings and the user saves an edit in place
- **THEN** the written file SHALL use LF everywhere

#### Scenario: CRLF source stays CRLF

- **WHEN** the source file uses CRLF line endings and the user saves an edit in place
- **THEN** the written file SHALL use CRLF everywhere, including the rewritten block
- **AND** the untouched regions SHALL retain their original `\r\n` sequences

### Requirement: Refuse when an edited body contains a request separator

When any rewritten body contains a line matching the request separator syntax (`^#{3,}` after trimming), the in-place save SHALL NOT write any file and SHALL display a transient error message. This prevents the written file from splitting that request on reload.

#### Scenario: Edited body with a separator-looking line is refused

- **WHEN** the user commits a body containing a line `### Oops` and presses `Ctrl+S`
- **THEN** no file SHALL be written
- **AND** a transient error message SHALL be displayed

#### Scenario: A normal edited body is written

- **WHEN** the user commits a body with no `###`-prefixed line and presses `Ctrl+S`
- **THEN** the file SHALL be written

### Requirement: Refuse when the source file changed structurally

When the source file re-parsed at save time contains a different number of requests than the in-memory state, the in-place save SHALL NOT write any file and SHALL display a transient error message. This prevents rewriting blocks at misaligned positions after an external edit added or removed requests.

#### Scenario: Structural change is refused

- **WHEN** the file on disk gains or loses a request outside the app and the user presses `Ctrl+S`
- **THEN** no file SHALL be written
- **AND** a transient error message SHALL be displayed

### Requirement: Successful in-place save shows a transient confirmation

On a successful write, the system SHALL display a transient message naming the file and the number of rewritten requests, using the existing `SET_TRANSIENT_MESSAGE` / `CLEAR_TRANSIENT_MESSAGE` mechanism and the existing transient timeout.

#### Scenario: Confirmation after a successful in-place save

- **WHEN** 2 requests are rewritten to `/home/user/api.http`
- **THEN** the status bar SHALL display a transient message like "Saved 2 requests to api.http"
