## ADDED Requirements

### Requirement: Transient error message
The status bar SHALL display a transient error message in red bold while one is set, and SHALL NOT display it when none is set. Transient error messages auto-clear after approximately 2 seconds via the same mechanism as transient success messages. When a transient error message is set, any transient success message SHALL be cleared, and vice versa.

#### Scenario: Transient error shown when set
- **WHEN** the status bar is rendered with a non-null `transientError`
- **THEN** the status bar SHALL display the error message text in red bold

#### Scenario: Transient error hidden when null
- **WHEN** the status bar is rendered with `transientError: null`
- **THEN** the status bar SHALL contain no transient error message

#### Scenario: Transient error and success are mutually exclusive
- **WHEN** a `RELOAD_ERROR` is dispatched while a transient success message is showing
- **THEN** the success message SHALL be cleared and the error message SHALL be shown

#### Scenario: Transient success clears error
- **WHEN** a `SET_TRANSIENT_MESSAGE` is dispatched with a non-null message while a transient error is showing
- **THEN** the error message SHALL be cleared and the success message SHALL be shown
