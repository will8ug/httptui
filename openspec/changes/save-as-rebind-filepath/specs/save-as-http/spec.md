# Delta Spec: Save as .http

## ADDED Requirements

### Requirement: Save rebinds the current file to the written path

On a successful write, the system SHALL set the current file path to the actual written path — the conflict-resolved path, including any auto-incremented suffix. The status bar SHALL display the written file's name, the reload command (`R`) SHALL read from the written file, and the next save overlay default SHALL derive from the written file's basename. The current file path SHALL NOT change when the save is cancelled or fails.

#### Scenario: Save-as to a new path rebinds the current file

- **WHEN** the loaded file is `/home/user/collections/MyAPI.json` and the user saves to `/home/user/collections/MyAPI.http`
- **THEN** the current file SHALL become `/home/user/collections/MyAPI.http` and the status bar SHALL display `MyAPI.http`

#### Scenario: Conflict-suffixed save rebinds to the suffixed path

- **WHEN** the loaded file is `api.http`, the user accepts the default `api.http`, and the save writes to `api - 1.http` because `api.http` already exists
- **THEN** the current file SHALL become `api - 1.http`

#### Scenario: Cancelled save leaves the current file unchanged

- **WHEN** the user presses `Escape` while the save overlay is open
- **THEN** the current file path SHALL remain the loaded file path

#### Scenario: Failed save leaves the current file unchanged

- **WHEN** the write fails and the save overlay reports the error
- **THEN** the current file path SHALL remain the loaded file path
