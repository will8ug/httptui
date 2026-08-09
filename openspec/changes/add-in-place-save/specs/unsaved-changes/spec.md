# Spec: Unsaved Changes — Delta

## MODIFIED Requirements

### Requirement: Successful save clears the unsaved-changes flag

Any successful save SHALL clear every request's unsaved-changes marker — the file-level flag is derived from the markers, so clearing them un-sets it — and SHALL set the current file path to the actual written path. A save-as (`S`) succeeds only when it writes to a path that does not already exist; when the target exists, the save-as is refused and every marker SHALL remain set (see the **save-as-http** spec). An in-place save (`Ctrl+S`) succeeds by overwriting the source file and SHALL also clear every marker, leaving the current file path unchanged (see the **in-place-save** spec). The markers SHALL clear because the in-memory requests are synced to the file the application now tracks.

#### Scenario: Save clears the markers

- **WHEN** at least one request's marker is set and the user completes a save with `S`
- **THEN** every request's marker SHALL be cleared and the status bar SHALL no longer show the `*` prefix

#### Scenario: Refused save leaves the markers set and the file unchanged

- **WHEN** the loaded file is `api.http`, at least one request's marker is set, and the save is refused because the target path already exists
- **THEN** every request's marker SHALL remain set and the current file path SHALL NOT change

#### Scenario: Failed save leaves the markers set and the file unchanged

- **WHEN** a save fails and the save overlay reports the error
- **THEN** every request's marker SHALL remain set and the current file path SHALL NOT change

#### Scenario: In-place save clears the markers

- **WHEN** at least one request's marker is set and the user completes an in-place save with `Ctrl+S`
- **THEN** every request's marker SHALL be cleared and the status bar SHALL no longer show the `*` prefix
- **AND** the current file path SHALL remain unchanged

#### Scenario: Refused in-place save leaves the markers set

- **WHEN** at least one request's marker is set and an in-place save is refused because an edited body contains a `###` separator line
- **THEN** every request's marker SHALL remain set

#### Scenario: Declined in-place save leaves the markers set

- **WHEN** at least one request's marker is set and the user declines the in-place save confirmation prompt (`n` or `Escape`)
- **THEN** every request's marker SHALL remain set and the current file path SHALL NOT change
