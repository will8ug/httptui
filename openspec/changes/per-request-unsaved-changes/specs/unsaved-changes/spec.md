# Spec: Unsaved Changes — Delta

## MODIFIED Requirements

### Requirement: Track unsaved changes at the file level

The system SHALL track unsaved changes per request: each in-memory request SHALL carry a marker indicating whether it has been edited since the last load, reload, or save. A committed edit that changes a request's stored value SHALL set that request's marker; a commit producing a value identical to the request's stored value SHALL NOT set the marker. Once set, a request's marker SHALL remain set until the file is loaded, reloaded, or saved — a later edit that reverts the request to its original value SHALL NOT clear it. The file-level unsaved-changes flag SHALL be derived from the per-request markers: it SHALL be set when any request's marker is set and SHALL be unset when no request's marker is set. Every marker SHALL start unset when the application launches.

#### Scenario: Committing a change sets that request's marker

- **WHEN** the user commits a body edit whose value differs from the request's previous body
- **THEN** that request's marker SHALL be set

#### Scenario: Committing an unchanged value leaves the marker unset

- **WHEN** the user opens the body editor and commits without altering the buffer
- **THEN** the request's marker SHALL remain unset

#### Scenario: Cancelling an edit leaves the marker unset

- **WHEN** the user modifies the editor buffer and cancels with `Escape`
- **THEN** the request's marker SHALL remain unset

#### Scenario: Editing one request leaves other requests unmarked

- **WHEN** the user commits a body edit on one request
- **THEN** only that request's marker SHALL be set
- **AND** every other request's marker SHALL remain unset

#### Scenario: Markers are unset on launch

- **WHEN** the application starts
- **THEN** every request's marker SHALL be unset

#### Scenario: Reverting a body to its original value keeps the marker set

- **WHEN** the user commits a body edit and then commits a second edit restoring the body to its value at load time
- **THEN** the request's marker SHALL remain set

#### Scenario: File-level flag is set when any request is marked

- **WHEN** at least one request's marker is set
- **THEN** the file-level unsaved-changes flag SHALL be set

#### Scenario: File-level flag is unset when no request is marked

- **WHEN** no request's marker is set
- **THEN** the file-level unsaved-changes flag SHALL be unset
