## ADDED Requirements

### Requirement: File reload error display
When a file reload fails (file read or parse error), the system SHALL dispatch a `RELOAD_ERROR` action that clears the current response, sets the error state, and clears all search state. The error message SHALL be displayed in the response panel.

#### Scenario: File read failure during reload
- **WHEN** the user triggers a file reload and the file at `state.filePath` cannot be read
- **THEN** the response panel SHALL display the error message
- **AND** the previous response SHALL be cleared
- **AND** all search state SHALL be cleared

#### Scenario: Parse failure during reload
- **WHEN** the user triggers a file reload and the file content cannot be parsed
- **THEN** the response panel SHALL display the error message
- **AND** the previous response SHALL be cleared
- **AND** all search state SHALL be cleared

#### Scenario: Reload failure after discard confirm
- **WHEN** the user confirms a discard action that triggers a reload and the reload fails
- **THEN** the response panel SHALL display the error message
- **AND** the unsaved-changes flag SHALL remain set
