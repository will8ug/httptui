# Spec: Save as .http — Delta

## MODIFIED Requirements

### Requirement: File-name conflict refusal

When the resolved target path already exists, the system SHALL refuse the save: it SHALL NOT write any file, SHALL NOT change the current file path, and SHALL NOT change the unsaved-changes flag. The system SHALL display an error in the save overlay and SHALL keep the overlay open so the user can modify the path. The error SHALL be cleared when the user modifies the save input (see the **Save error handling** requirement). This refusal applies to the save-as flow (`S`); an in-place save overwrites the source file by design and SHALL NOT be refused (see the **in-place-save** spec).

#### Scenario: Target path does not exist

- **WHEN** the resolved target path is `/tmp/api.http` and no file exists at that path
- **THEN** the system SHALL write to `/tmp/api.http` directly

#### Scenario: Target path exists

- **WHEN** the resolved target path is `/tmp/api.http` and `/tmp/api.http` already exists
- **THEN** the system SHALL NOT write any file
- **AND** the save overlay SHALL display an error and SHALL remain open
- **AND** the current file path and the unsaved-changes flag SHALL remain unchanged

#### Scenario: In-place save of the source file is not refused

- **WHEN** the target of an in-place save is the source file itself, which already exists
- **THEN** the system SHALL write the file, overwriting it (see the **in-place-save** spec)
