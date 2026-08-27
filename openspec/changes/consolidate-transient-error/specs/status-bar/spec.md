## MODIFIED Requirements

### Requirement: Transient error message
The status bar SHALL display a transient error message in red bold while one is set, and SHALL NOT display it when none is set. Transient error messages auto-clear after approximately 2 seconds via the same mechanism as transient success messages. When a transient error message is set, any transient success message SHALL be cleared, and vice versa.

#### Scenario: Transient error shown when set
- **WHEN** the status bar is rendered with a non-null `transientError`
- **THEN** the status bar SHALL display the error message text in red bold

#### Scenario: Transient error hidden when null
- **WHEN** the status bar is rendered with `transientError: null`
- **THEN** the status bar SHALL contain no transient error message

#### Scenario: Transient error and success are mutually exclusive
- **WHEN** a transient error message is set while a transient success message is showing
- **THEN** the success message SHALL be cleared and the error message SHALL be shown

#### Scenario: Transient error clears showing warning
- **WHEN** a transient error message is set while a transient warning is showing
- **THEN** the warning SHALL be cleared and the error message SHALL be shown

#### Scenario: Transient success clears error
- **WHEN** a transient success message is set while a transient error message is showing
- **THEN** the error message SHALL be cleared and the success message SHALL be shown

### Requirement: Transient warning message
The status bar SHALL display a transient warning message in yellow bold while one is set, and SHALL NOT display it when none is set. Transient warnings auto-clear after approximately 2 seconds via the same mechanism as transient success and error messages. The three transient channels — success message, error message, and warning message — SHALL be mutually exclusive: setting one SHALL clear whichever of the others is currently showing.

#### Scenario: Transient warning shown when set
- **WHEN** the status bar is rendered with a non-null `transientWarning`
- **THEN** the status bar SHALL display the warning text in yellow bold

#### Scenario: Transient warning hidden when null
- **WHEN** the status bar is rendered with `transientWarning: null`
- **THEN** the frame SHALL contain no transient warning message

#### Scenario: Setting a warning clears a showing success message
- **WHEN** a transient warning is set while a transient success message is showing
- **THEN** the success message SHALL be cleared and the warning SHALL be shown

#### Scenario: Setting a success message clears a showing warning
- **WHEN** a transient success message is set while a transient warning is showing
- **THEN** the warning SHALL be cleared and the success message SHALL be shown

#### Scenario: Transient warning auto-clears
- **WHEN** a transient warning is set and approximately 2 seconds elapse without the transient text changing
- **THEN** the status bar SHALL no longer display the warning
