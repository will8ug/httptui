## MODIFIED Requirements

### Requirement: Successful save clears the unsaved-changes flag

Any successful save SHALL clear the unsaved-changes flag and SHALL set the current file path to the actual written path. A save succeeds only when it writes to a path that does not already exist; when the target exists, the save is refused and the flag SHALL remain set (see the **save-as-http** spec). The flag SHALL clear because the in-memory requests are synced to the file the application now tracks.

#### Scenario: Save clears the marker

- **WHEN** the unsaved-changes flag is set and the user completes a save with `S`
- **THEN** the flag SHALL be cleared and the status bar SHALL no longer show the `*` prefix

#### Scenario: Refused save leaves the marker set and the file unchanged

- **WHEN** the loaded file is `api.http`, the unsaved-changes flag is set, and the save is refused because the target path already exists
- **THEN** the unsaved-changes flag SHALL remain set and the current file path SHALL NOT change

#### Scenario: Failed save leaves the marker set and the file unchanged

- **WHEN** a save fails and the save overlay reports the error
- **THEN** the unsaved-changes flag SHALL remain set and the current file path SHALL NOT change
