# Delta Spec: Unsaved Changes

## MODIFIED Requirements

### Requirement: Successful save clears the unsaved-changes flag

Any successful save SHALL clear the unsaved-changes flag and SHALL set the current file path to the actual written path. Because the save command writes to a new file and auto-increments a suffix on conflict (see the **save-as-http** spec), the current file SHALL become the conflict-resolved written path, which may differ from the file path that was loaded before the save. The flag SHALL clear because the in-memory requests are synced to the file the application now tracks.

#### Scenario: Save clears the marker

- **WHEN** the unsaved-changes flag is set and the user completes a save with `S`
- **THEN** the flag SHALL be cleared and the status bar SHALL no longer show the `*` prefix

#### Scenario: Save to a conflict-suffixed path clears the marker and rebinds

- **WHEN** the loaded file is `api.http`, the unsaved-changes flag is set, and the save writes to `api - 1.http` because the target already exists
- **THEN** the flag SHALL be cleared and the current file SHALL become `api - 1.http`

#### Scenario: Failed save leaves the marker set and the file unchanged

- **WHEN** a save fails and the save overlay reports the error
- **THEN** the unsaved-changes flag SHALL remain set and the current file path SHALL NOT change
