## MODIFIED Requirements

### Requirement: TOGGLE_FULLSCREEN action
The system SHALL define a `TOGGLE_FULLSCREEN` action type in the `Action` union. The reducer SHALL handle `TOGGLE_FULLSCREEN` as follows:
- If `state.maximizedPanel` is `null`, set `maximizedPanel` to the current `focusedPanel` value and reset the horizontal scroll offset of the newly maximized panel to `0`.
- If `state.maximizedPanel` is not `null`, set `maximizedPanel` to `null` and reset the horizontal scroll offset of the previously maximized panel to `0`.

Offset resets per panel:
- `requests` panel: reset `requestHorizontalOffset` to `0`
- `response` panel: reset `responseHorizontalOffset` to `0`, and additionally reset `responseScrollOffset` to `0` (both entering and leaving fullscreen, so the vertical scroll cannot rest past the end of the differently-sized fullscreen view)
- `details` panel: reset `detailsHorizontalOffset` to `0`

#### Scenario: Initial state has no fullscreen panel
- **WHEN** the application starts
- **THEN** `maximizedPanel` SHALL be `null`

#### Scenario: Enter fullscreen from normal view
- **WHEN** `maximizedPanel` is `null`, `focusedPanel` is `'response'`, and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `'response'` and `responseHorizontalOffset` SHALL become `0`
- **AND** `responseScrollOffset` SHALL become `0`

#### Scenario: Enter fullscreen on requests panel
- **WHEN** `maximizedPanel` is `null`, `focusedPanel` is `'requests'`, and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `'requests'` and `requestHorizontalOffset` SHALL become `0`

#### Scenario: Enter fullscreen on details panel
- **WHEN** `maximizedPanel` is `null`, `focusedPanel` is `'details'`, and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `'details'` and `detailsHorizontalOffset` SHALL become `0`

#### Scenario: Exit fullscreen to normal view
- **WHEN** `maximizedPanel` is `'response'` and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `null` and `responseHorizontalOffset` SHALL become `0`
- **AND** `responseScrollOffset` SHALL become `0`

#### Scenario: Exit fullscreen from requests panel
- **WHEN** `maximizedPanel` is `'requests'` and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `null` and `requestHorizontalOffset` SHALL become `0`

#### Scenario: Exit fullscreen from details panel
- **WHEN** `maximizedPanel` is `'details'` and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `null` and `detailsHorizontalOffset` SHALL become `0`
