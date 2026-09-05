## MODIFIED Requirements

### Requirement: Enter response save with s in normal mode

Pressing `s` in normal mode while a response with a non-empty body is displayed SHALL open the response-save overlay. Pressing `s` when no response is displayed (no response received yet, or the last send failed) SHALL NOT open the overlay and SHALL display a transient message stating there is no response to save. Pressing `s` when the displayed response's body is empty (for example a HEAD, OPTIONS, or 204 response) SHALL NOT open the overlay and SHALL display a transient message stating the response has no body to save. The `s` key SHALL open the overlay only in normal mode; while any other overlay or input mode is active (file load, search, environment select, save-as, request editor, or a confirmation prompt), `s` SHALL be handled as that mode's input instead. While the response-save overlay itself is open, `s` SHALL be inserted into the path input as text.

#### Scenario: Press s with a response opens the overlay
- **WHEN** a response is displayed in the response panel and the user presses `s` in normal mode
- **THEN** the response-save overlay SHALL be displayed with the default path pre-filled
- **AND** no file SHALL be written yet

#### Scenario: Press s with no response shows a transient message
- **WHEN** no response has been received and the user presses `s` in normal mode
- **THEN** the overlay SHALL NOT open
- **AND** a transient message stating there is no response to save SHALL be displayed

#### Scenario: Press s with an empty response body shows a transient message
- **WHEN** the displayed response has an empty body and the user presses `s` in normal mode
- **THEN** the overlay SHALL NOT open
- **AND** a transient message stating the response has no body to save SHALL be displayed
- **AND** no file SHALL be written

#### Scenario: Press s while the request editor is open inserts nothing
- **WHEN** the request editor is open and the user presses `s`
- **THEN** the `s` SHALL be handled as editor input and SHALL NOT open the response-save overlay

#### Scenario: Press s while the response-save overlay is open types the character
- **WHEN** the response-save overlay is open and the user presses `s`
- **THEN** `s` SHALL be inserted into the path input and the overlay SHALL remain open

### Requirement: Raw body fidelity
The written file SHALL contain the response body exactly as received from the server — the captured body before line-ending normalization (see the **executor** spec), with the server's original CRLF and lone CR line endings preserved — with no pretty-printing, no status line, and no headers, regardless of the wrap, raw, or verbose display toggles.

#### Scenario: JSON body is saved unformatted
- **WHEN** the displayed response body is the single line `{"a":1}` and the user confirms the save
- **THEN** the written file SHALL contain `{"a":1}` on one line and SHALL NOT contain indented JSON

#### Scenario: Pretty-printed display does not alter the saved file
- **WHEN** the response panel displays the body pretty-printed across multiple indented lines and the user confirms the save
- **THEN** the written file SHALL contain the original single-line body

#### Scenario: CRLF line endings are preserved in the saved file
- **WHEN** the server responded with a body whose lines are terminated by `\r\n` and the user confirms the save
- **THEN** the written file SHALL contain the `\r\n` sequences exactly as received
- **AND** the file SHALL NOT be the LF-normalized form shown in the response panel
