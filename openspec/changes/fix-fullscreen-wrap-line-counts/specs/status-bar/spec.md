## MODIFIED Requirements

### Requirement: Context-aware status text
The right segment of the status bar SHALL show the current file name followed by context information for the focused panel. When `focusedPanel` is `'requests'`, the status SHALL show the selected position as `{selectedIndex + 1}/{requestCount}`. When `focusedPanel` is `'details'`, the status SHALL show the scroll position over `detailsTotalLines`. When `focusedPanel` is `'response'` and a response exists, the status SHALL show the scroll position over `responseTotalLines`; when no response exists, the status SHALL show only the file name with no line-position indicator. `responseTotalLines` SHALL reflect the response panel's current layout: in wrap mode the total counts visual lines at the panel's rendered content width — the split-layout width in the normal view, the fullscreen width while the response panel is maximized. (The shortcut bar on the left is specified in the **shortcuts** spec; the environment-name indicator is specified in the **runtime-environment-switching** spec; the INSECURE indicator is specified in the **executor** spec.)

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

#### Scenario: Response line total reflects the maximized layout in wrap mode
- **WHEN** the response panel is maximized, `wrapMode` is `'wrap'`, and body lines wrap into fewer visual lines at the fullscreen width than at the split width
- **THEN** the displayed `responseTotalLines` SHALL be the visual-line count of the maximized panel (smaller than the split-view total for the same body)
