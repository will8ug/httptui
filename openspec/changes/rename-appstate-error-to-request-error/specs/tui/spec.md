## MODIFIED Requirements

### Requirement: File reload error display
When a file reload fails (file read or parse error), the system SHALL dispatch a `RELOAD_ERROR` action that sets a transient error message in the status bar. The system SHALL NOT clear the current response, request error state, or search state when a reload error occurs. The transient error message SHALL auto-clear after approximately 2 seconds.

#### Scenario: File read failure during reload
- **WHEN** the user triggers a file reload and the file at `state.filePath` cannot be read
- **THEN** a transient error message SHALL be displayed in the status bar
- **AND** the current response SHALL be preserved
- **AND** all search state SHALL be preserved

#### Scenario: Parse failure during reload
- **WHEN** the user triggers a file reload and the file content cannot be parsed
- **THEN** a transient error message SHALL be displayed in the status bar
- **AND** the current response SHALL be preserved
- **AND** all search state SHALL be preserved

#### Scenario: Reload failure after discard confirm
- **WHEN** the user confirms a discard action that triggers a reload and the reload fails
- **THEN** a transient error message SHALL be displayed in the status bar
- **AND** the unsaved-changes flag SHALL remain set
