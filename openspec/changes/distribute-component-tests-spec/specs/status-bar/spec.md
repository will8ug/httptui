## ADDED Requirements

### Requirement: Context-aware status text
The right segment of the status bar SHALL show the current file name followed by context information for the focused panel. When `focusedPanel` is `'requests'`, the status SHALL show the selected position as `{selectedIndex + 1}/{requestCount}`. When `focusedPanel` is `'details'`, the status SHALL show the scroll position over `detailsTotalLines`. When `focusedPanel` is `'response'` and a response exists, the status SHALL show the scroll position over `responseTotalLines`; when no response exists, the status SHALL show only the file name with no line-position indicator. (The shortcut bar on the left is specified in the **shortcuts** spec; the environment-name indicator is specified in the **runtime-environment-switching** spec; the INSECURE indicator is specified in the **executor** spec.)

#### Scenario: Requests-focus status shows selection position
- **WHEN** `StatusBar` is rendered with `focusedPanel: 'requests'`
- **THEN** the status text SHALL show the file name and `selectedIndex + 1` over `requestCount` (e.g. `1/3`)

#### Scenario: Details-focus status shows line position
- **WHEN** `StatusBar` is rendered with `focusedPanel: 'details'`
- **THEN** the status text SHALL show the scroll position over `detailsTotalLines`

#### Scenario: Response-focus status shows line position
- **WHEN** `StatusBar` is rendered with `focusedPanel: 'response'` and `hasResponse: true`
- **THEN** the status text SHALL show the scroll position over `responseTotalLines`

#### Scenario: Response-focus status without a response omits line position
- **WHEN** `StatusBar` is rendered with `focusedPanel: 'response'` and `hasResponse: false`
- **THEN** the status text SHALL show only the file name with no line-position indicator

### Requirement: Transient status message
The status bar SHALL display a transient message (e.g. the `Reloaded` / `Loaded: {name}` confirmations and the `No environments configured` notice) while one is set, and SHALL NOT display it when none is set. Transient messages auto-clear after approximately 2 seconds.

#### Scenario: Transient message is shown when set
- **WHEN** `StatusBar` is rendered with a non-null `transientMessage`
- **THEN** the frame SHALL contain the transient message text

#### Scenario: Transient message is hidden when null
- **WHEN** `StatusBar` is rendered with `transientMessage: null`
- **THEN** the frame SHALL contain no transient message
