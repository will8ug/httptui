# Spec: In-place Save

## Purpose

Writing edited requests back to the source `.http`/`.rest` file via `Ctrl+S` in normal mode: surgical block replacement of only the requests whose body changed, source-format gating, overwrite semantics, line-ending preservation, and the guard against separator lines in edited bodies.

## ADDED Requirements

### Requirement: Enter in-place save with Ctrl+S in normal mode

Pressing `Ctrl+S` in normal mode SHALL write the in-memory requests back to the source file at `state.filePath`, overwriting it. `Ctrl+S` SHALL perform the in-place save only in normal mode; while the body editor is open it SHALL commit the edit buffer (see the **request-editing** spec); in any other mode (`fileLoad`, `search`, `envSelect`, `saveLoad`, `edit`, `confirmDiscard`) it SHALL NOT trigger an in-place save.

#### Scenario: Ctrl+S in normal mode saves in place

- **WHEN** the application is in normal mode and the user presses `Ctrl+S`
- **THEN** the system SHALL write the edited requests back to `state.filePath`

#### Scenario: Ctrl+S in the body editor commits instead of saving

- **WHEN** the body editor is open and the user presses `Ctrl+S`
- **THEN** the edit buffer SHALL be committed to the selected request and no file SHALL be written

#### Scenario: Ctrl+S in the file-load overlay is inert

- **WHEN** the file-load overlay is open and the user presses `Ctrl+S`
- **THEN** the in-place save SHALL NOT occur and the overlay SHALL remain open

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

- **WHEN** the source file `api.http` exists at `state.filePath` and the user presses `Ctrl+S` with unsaved body edits
- **THEN** the file SHALL be overwritten with the new content

#### Scenario: File path is unchanged after an in-place save

- **WHEN** the user completes an in-place save to `api.http`
- **THEN** `state.filePath` SHALL remain `api.http` and the status bar SHALL continue to show `api.http`

### Requirement: Only edited request blocks are rewritten

The in-place save SHALL compare each in-memory request's `body` against the body of the corresponding request freshly parsed from the source file, and SHALL rewrite only the blocks whose body differs. Content outside a rewritten block — comments, variables, blank lines, and non-edited requests — SHALL remain byte-identical. When no request body differs, the system SHALL NOT write any file and SHALL NOT display a confirmation message.

#### Scenario: Editing one of several requests rewrites only that block

- **WHEN** a source file contains three requests, the user edits only the second request's body, and presses `Ctrl+S`
- **THEN** only the second request's block SHALL be rewritten
- **AND** the first and third request blocks, comments, and variables SHALL be byte-identical

#### Scenario: A form-data request is never rewritten

- **WHEN** a source file contains a form-data request and the user edits a different request's body and presses `Ctrl+S`
- **THEN** the form-data request's block SHALL remain byte-identical (form-data requests cannot be edited; see the **request-editing** spec)

#### Scenario: No edits produce no write

- **WHEN** the user presses `Ctrl+S` and no request body differs from the freshly parsed source
- **THEN** the system SHALL NOT write any file
- **AND** the system SHALL NOT display a confirmation message

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

### Requirement: Successful in-place save shows a transient confirmation

On a successful write, the system SHALL display a transient message naming the file and the number of rewritten requests, using the existing `SET_TRANSIENT_MESSAGE` / `CLEAR_TRANSIENT_MESSAGE` mechanism and the existing transient timeout.

#### Scenario: Confirmation after a successful in-place save

- **WHEN** 2 requests are rewritten to `/home/user/api.http`
- **THEN** the status bar SHALL display a transient message like "Saved 2 requests to api.http"
