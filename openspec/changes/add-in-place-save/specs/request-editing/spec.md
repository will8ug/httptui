# Spec: Request Editing — Delta

## MODIFIED Requirements

### Requirement: Commit the edit with Ctrl+S

`Ctrl+S` SHALL commit the buffer to the selected request's `body`, close the overlay, and return to normal mode. This commit behavior applies only while the body editor is open; in normal mode `Ctrl+S` performs an in-place save of the source file instead (see the **in-place-save** spec). An empty buffer SHALL be committed as `undefined` rather than as an empty string. The committed request SHALL replace the entry at the selected index in `state.requests` without mutating the previous object. When the committed value differs from the request's stored body, a transient confirmation message SHALL be displayed and SHALL auto-clear using the existing transient-message mechanism. When the committed value equals the stored body, no transient confirmation message SHALL be displayed.

#### Scenario: Commit stores the edited body

- **WHEN** the user opens the editor, changes the buffer to `{"name":"Bob"}`, and presses `Ctrl+S`
- **THEN** the selected request's `body` SHALL be `{"name":"Bob"}`, the overlay SHALL close, and `mode` SHALL return to `'normal'`

#### Scenario: Empty buffer commits as undefined

- **WHEN** the user deletes all buffer content and presses `Ctrl+S`
- **THEN** the selected request's `body` SHALL be `undefined`, not the empty string

#### Scenario: Commit shows a transient confirmation

- **WHEN** the user commits an edit whose buffer differs from the stored body
- **THEN** the status bar SHALL display a transient confirmation message

#### Scenario: Commit without changes shows no confirmation

- **WHEN** the user presses `Ctrl+S` with a buffer identical to the stored body (or the editor was opened and closed without edits)
- **THEN** the overlay SHALL close, `mode` SHALL return to `'normal'`, and the status bar SHALL NOT display a transient confirmation message

#### Scenario: Committed body is used by the request-details panel

- **WHEN** the user commits a body edit and the request-details panel is visible for that request
- **THEN** the panel SHALL display the newly committed body with variables resolved

#### Scenario: Committed body is exported by save

- **WHEN** the user commits a body edit and then saves with `S`
- **THEN** the written `.http` file SHALL contain the edited body

#### Scenario: Ctrl+S in normal mode saves in place instead of committing

- **WHEN** the application is in normal mode and the user presses `Ctrl+S`
- **THEN** no edit overlay SHALL open and no edit SHALL be committed
- **AND** the source file SHALL be saved in place (see the **in-place-save** spec)
