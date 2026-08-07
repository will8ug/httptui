## REMOVED Requirements

### Requirement: File-name conflict auto-suffix
**Reason**: Replaced by refuse-on-conflict semantics. The ` - N` suffix auto-rename silently wrote to a file the user never named, and combined with the save rebind it produced stacked sibling names (`api - 1 - 1.http`). Vim's `:saveas` model refuses instead of renaming; the save-as behavior now follows it.
**Migration**: When the resolved target exists, the save overlay now displays an error and stays open instead of writing to a suffixed sibling. No files previously written by the auto-suffix rule are affected; the rule simply no longer applies.

## ADDED Requirements

### Requirement: File-name conflict refusal

When the resolved target path already exists, the system SHALL refuse the save: it SHALL NOT write any file, SHALL NOT change the current file path, and SHALL NOT change the unsaved-changes flag. The system SHALL display an error in the save overlay and SHALL keep the overlay open so the user can modify the path. The error SHALL be cleared when the user modifies the save input (see the **Save error handling** requirement).

#### Scenario: Target path does not exist

- **WHEN** the resolved target path is `/tmp/api.http` and no file exists at that path
- **THEN** the system SHALL write to `/tmp/api.http` directly

#### Scenario: Target path exists

- **WHEN** the resolved target path is `/tmp/api.http` and `/tmp/api.http` already exists
- **THEN** the system SHALL NOT write any file
- **AND** the save overlay SHALL display an error and SHALL remain open
- **AND** the current file path and the unsaved-changes flag SHALL remain unchanged

## MODIFIED Requirements

### Requirement: Save rebinds the current file to the written path

On a successful write, the system SHALL set the current file path to the actual written path — the path the user resolved and confirmed. The status bar SHALL display the written file's name, the reload command (`R`) SHALL read from the written file, and the next save overlay default SHALL derive from the written file's basename. The current file path SHALL NOT change when the save is cancelled, refused, or fails.

#### Scenario: Save-as to a new path rebinds the current file

- **WHEN** the loaded file is `/home/user/collections/MyAPI.json` and the user saves to `/home/user/collections/MyAPI.http`
- **THEN** the current file SHALL become `/home/user/collections/MyAPI.http` and the status bar SHALL display `MyAPI.http`

#### Scenario: Cancelled save leaves the current file unchanged

- **WHEN** the user presses `Escape` while the save overlay is open
- **THEN** the current file path SHALL remain the loaded file path

#### Scenario: Failed save leaves the current file unchanged

- **WHEN** the write fails and the save overlay reports the error
- **THEN** the current file path SHALL remain the loaded file path

### Requirement: Save confirmation transient message

On successful write, the system SHALL display a transient status message indicating the number of requests saved and the actual file path written. The message SHALL use the existing `SET_TRANSIENT_MESSAGE` / `CLEAR_TRANSIENT_MESSAGE` mechanism and SHALL clear after the existing transient timeout.

#### Scenario: Successful save shows confirmation

- **WHEN** the serializer produces text for 5 requests and the file is written to `/tmp/api.http`
- **THEN** the status bar SHALL display a transient message like "Saved 5 requests to /tmp/api.http"
