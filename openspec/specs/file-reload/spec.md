# Spec: File Reload

## Purpose

The `R`-key reload of the currently loaded file: re-reading and re-parsing the file, preserving or resetting the selection, clearing stale response state, and reporting reload errors.

## Requirements

### Requirement: Reload the current file with R

The `R` key in normal mode SHALL reload the file at the current file path by reading and parsing it, then dispatch a reload with the result. If the reloaded file still contains the currently selected request name, the selection SHALL be preserved; otherwise the selected index SHALL reset to 0. A successful reload SHALL clear the current response, the request error, and the response scroll offset, and SHALL display a transient "Reloaded" confirmation in the status bar.

#### Scenario: R reloads the file and preserves the selection

- **WHEN** the user presses `R` and the reloaded file still contains the selected request name
- **THEN** the file SHALL be reloaded, the selection SHALL be preserved, and a transient "Reloaded" confirmation SHALL be displayed in the status bar

#### Scenario: R resets the selection when the selected request is gone

- **WHEN** the user presses `R` and the reloaded file no longer contains the selected request name
- **THEN** the selected index SHALL reset to 0

#### Scenario: Reload clears response and scroll state

- **WHEN** the user sends a request, scrolls the response, and then presses `R`
- **THEN** the response, the request error, and the response scroll offset SHALL be cleared

### Requirement: File reload error display

When a file reload fails (file read or parse error), the system SHALL set a transient error message in the status bar. The system SHALL NOT clear the current response, request error state, or search state when a reload error occurs. The transient error message SHALL auto-clear after approximately 2 seconds.

#### Scenario: File read failure during reload

- **WHEN** the user triggers a file reload and the file at the current file path cannot be read
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
