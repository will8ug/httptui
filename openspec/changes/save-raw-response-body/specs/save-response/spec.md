## MODIFIED Requirements

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
