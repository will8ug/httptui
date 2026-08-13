## MODIFIED Requirements

### Requirement: Cancel the edit with Escape

`Escape` SHALL cancel the edit and return to normal mode without applying any tab's buffer to the request. When every tab's buffer matches the request's stored values, `Escape` SHALL close the editor immediately. When at least one tab's buffer differs from the request's stored values — the URL buffer differs from the request's `url`, the body buffer differs from the request's `body` (or from the empty string when `body` is `undefined`), or the headers buffer differs from the request's `headers` record rendered as one `Name: Value` line per entry in stored insertion order — the first `Escape` SHALL NOT close the editor: it SHALL display the transient message `Press Esc again to discard changes` using the existing transient-message mechanism and arm a cancel window of two seconds. A second `Escape` pressed within that window SHALL close the editor and discard every tab's buffer. A second `Escape` pressed after the window has expired SHALL re-arm the window and re-display the transient message, leaving the editor open. Committing with `Ctrl+S` and cancelling SHALL each clear any armed window.

#### Scenario: Escape with no changes closes immediately

- **WHEN** the user opens the editor, changes nothing in any tab, and presses `Escape`
- **THEN** the overlay SHALL close, `mode` SHALL return to `'normal'`, and no transient message SHALL be displayed

#### Scenario: Escape discards edits to all tabs

- **WHEN** the user opens the editor, modifies the URL buffer, switches to the body tab, modifies the body buffer, presses `Escape` once, and presses `Escape` again within two seconds
- **THEN** the overlay SHALL close, `mode` SHALL return to `'normal'`, and the selected request's `url` and `body` SHALL be unchanged

#### Scenario: Escape does not prompt

- **WHEN** the user has modified a buffer and presses `Escape`
- **THEN** no confirmation prompt SHALL be displayed; instead the editor SHALL remain open, `mode` SHALL remain `'edit'`, and the status bar SHALL display the transient message `Press Esc again to discard changes`

#### Scenario: Escape after the window expires re-arms instead of discarding

- **WHEN** the user modifies a buffer, presses `Escape` once, waits longer than two seconds, and presses `Escape` again
- **THEN** the overlay SHALL remain open, `mode` SHALL remain `'edit'`, and the status bar SHALL display the transient message `Press Esc again to discard changes` again

#### Scenario: Reopening after cancel shows the original values

- **WHEN** the user cancels an edit and presses `e` again on the same request
- **THEN** the URL tab SHALL be active and each tab's buffer SHALL be seeded from the unchanged stored values

#### Scenario: Committing after an armed Escape clears the window

- **WHEN** the user modifies a buffer, presses `Escape` once (arming the window), and then presses `Ctrl+S` within the window
- **THEN** the edit SHALL be committed, the overlay SHALL close, `mode` SHALL return to `'normal'`, and no `Press Esc again to discard changes` message SHALL remain displayed
