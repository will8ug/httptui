# Spec: Fullscreen Panel

## Purpose

Fullscreen panel mode allows any focused panel (requests, details, or response) to expand to fill the entire terminal area (minus the status bar), providing maximum viewing space for content inspection.

## ADDED Requirements

### Requirement: Fullscreen state field
The system SHALL add a `maximizedPanel: FocusedPanel | null` field to `AppState`. When `maximizedPanel` is `null`, the normal split-panel layout SHALL be rendered. When `maximizedPanel` is `'requests'`, `'details'`, or `'response'`, the corresponding panel SHALL be rendered at full terminal width and height (minus the status bar row), and all other panels SHALL be hidden.

#### Scenario: Initial state has no fullscreen panel
- **WHEN** the application starts
- **THEN** `maximizedPanel` SHALL be `null`

### Requirement: TOGGLE_FULLSCREEN action
The system SHALL define a `TOGGLE_FULLSCREEN` action type in the `Action` union. The reducer SHALL handle `TOGGLE_FULLSCREEN` as follows:
- If `state.maximizedPanel` is `null`, set `maximizedPanel` to the current `focusedPanel` value and reset the horizontal scroll offset of the newly maximized panel to `0`.
- If `state.maximizedPanel` is not `null`, set `maximizedPanel` to `null` and reset the horizontal scroll offset of the previously maximized panel to `0`.

Horizontal offset resets per panel:
- `requests` panel: reset `requestHorizontalOffset` to `0`
- `response` panel: reset `responseHorizontalOffset` to `0`
- `details` panel: reset `detailsHorizontalOffset` to `0`

#### Scenario: Enter fullscreen from normal view
- **WHEN** `maximizedPanel` is `null`, `focusedPanel` is `'response'`, and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `'response'` and `responseHorizontalOffset` SHALL become `0`

#### Scenario: Enter fullscreen on requests panel
- **WHEN** `maximizedPanel` is `null`, `focusedPanel` is `'requests'`, and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `'requests'` and `requestHorizontalOffset` SHALL become `0`

#### Scenario: Enter fullscreen on details panel
- **WHEN** `maximizedPanel` is `null`, `focusedPanel` is `'details'`, and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `'details'` and `detailsHorizontalOffset` SHALL become `0`

#### Scenario: Exit fullscreen to normal view
- **WHEN** `maximizedPanel` is `'response'` and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `null` and `responseHorizontalOffset` SHALL become `0`

#### Scenario: Exit fullscreen from requests panel
- **WHEN** `maximizedPanel` is `'requests'` and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `null` and `requestHorizontalOffset` SHALL become `0`

#### Scenario: Exit fullscreen from details panel
- **WHEN** `maximizedPanel` is `'details'` and `TOGGLE_FULLSCREEN` is dispatched
- **THEN** `maximizedPanel` SHALL become `null` and `detailsHorizontalOffset` SHALL become `0`

### Requirement: Fullscreen keyboard binding
The system SHALL bind the `f` key in `useInput` to dispatch `TOGGLE_FULLSCREEN` when no overlay is open and the application is in normal mode.

#### Scenario: Pressing f in normal mode toggles fullscreen
- **WHEN** the application is in normal mode, no overlay is open, and the user presses `f`
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched

#### Scenario: Pressing f while help overlay is open does nothing
- **WHEN** `showHelp` is `true` and the user presses `f`
- **THEN** no `TOGGLE_FULLSCREEN` action SHALL be dispatched (the help overlay input handler blocks all other input)

#### Scenario: Pressing f in file load mode does nothing
- **WHEN** `mode` is `'fileLoad'` and the user presses `f`
- **THEN** no `TOGGLE_FULLSCREEN` action SHALL be dispatched (the file load mode handler blocks normal key processing)

#### Scenario: Pressing f in search mode does nothing
- **WHEN** `mode` is `'search'` and the user presses `f`
- **THEN** no `TOGGLE_FULLSCREEN` action SHALL be dispatched (the search mode handler blocks normal key processing)

### Requirement: Escape exits fullscreen
In normal mode, when `maximizedPanel` is not `null` and the user presses `Escape`, the system SHALL dispatch `TOGGLE_FULLSCREEN` to exit fullscreen. This check SHALL occur after the help overlay, file load, and search mode handlers, but before the existing "clear active search results" Escape handler.

#### Scenario: Escape exits fullscreen
- **WHEN** `maximizedPanel` is `'response'` and the user presses `Escape` in normal mode
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched and `maximizedPanel` SHALL become `null`

#### Scenario: Escape does not enter fullscreen
- **WHEN** `maximizedPanel` is `null` and the user presses `Escape` in normal mode with no active search results
- **THEN** no `TOGGLE_FULLSCREEN` action SHALL be dispatched

#### Scenario: Escape priority over search result clearing
- **WHEN** `maximizedPanel` is `'response'` and there are active search results, and the user presses `Escape`
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched (exiting fullscreen takes priority over clearing search results; the user can press `Escape` again to clear search results after exiting fullscreen)

### Requirement: Tab is no-op in fullscreen
When `maximizedPanel` is not `null`, pressing `Tab` SHALL NOT dispatch `SWITCH_PANEL`. The `SWITCH_PANEL` action SHALL only be dispatched when `maximizedPanel` is `null`.

#### Scenario: Tab does nothing in fullscreen
- **WHEN** `maximizedPanel` is `'response'` and the user presses `Tab`
- **THEN** no `SWITCH_PANEL` action SHALL be dispatched and `focusedPanel` SHALL remain unchanged

#### Scenario: Tab works normally outside fullscreen
- **WHEN** `maximizedPanel` is `null` and the user presses `Tab`
- **THEN** a `SWITCH_PANEL` action SHALL be dispatched as usual

### Requirement: Toggle details on fullscreen details panel is no-op
When `maximizedPanel` is `'details'`, pressing `d` SHALL NOT dispatch `TOGGLE_REQUEST_DETAILS`. When `maximizedPanel` is not `'details'` (including `null`), pressing `d` SHALL dispatch `TOGGLE_REQUEST_DETAILS` as usual.

#### Scenario: Pressing d on fullscreen details panel does nothing
- **WHEN** `maximizedPanel` is `'details'` and the user presses `d`
- **THEN** no `TOGGLE_REQUEST_DETAILS` action SHALL be dispatched and `showRequestDetails` SHALL remain `true`

#### Scenario: Pressing d on fullscreen requests panel toggles details in state
- **WHEN** `maximizedPanel` is `'requests'`, `showRequestDetails` is `false`, and the user presses `d`
- **THEN** a `TOGGLE_REQUEST_DETAILS` action SHALL be dispatched and `showRequestDetails` SHALL become `true` (though the details panel is not visible until exiting fullscreen)

#### Scenario: Pressing d outside fullscreen toggles details normally
- **WHEN** `maximizedPanel` is `null`, `showRequestDetails` is `false`, and the user presses `d`
- **THEN** a `TOGGLE_REQUEST_DETAILS` action SHALL be dispatched and `showRequestDetails` SHALL become `true`

### Requirement: Fullscreen layout rendering
When `maximizedPanel` is not `null`, the `Layout` component SHALL render only the maximized panel at full terminal width and full terminal height minus one row for the status bar. The status bar SHALL remain visible at the bottom. The non-maximized panels SHALL NOT be rendered.

#### Scenario: Fullscreen response panel renders full width
- **WHEN** `maximizedPanel` is `'response'`
- **THEN** the `ResponseView` component SHALL be rendered with the full terminal width and `rows - 1` height, and the `RequestList` and `RequestDetailsView` components SHALL NOT be rendered

#### Scenario: Fullscreen requests panel renders full width
- **WHEN** `maximizedPanel` is `'requests'`
- **THEN** the `RequestList` component SHALL be rendered with the full terminal width and `rows - 1` height, and the `ResponseView` and `RequestDetailsView` components SHALL NOT be rendered

#### Scenario: Fullscreen details panel renders full width
- **WHEN** `maximizedPanel` is `'details'`
- **THEN** the `RequestDetailsView` component SHALL be rendered with the full terminal width and `rows - 1` height, and the `RequestList` and `ResponseView` components SHALL NOT be rendered

### Requirement: Fullscreen state preserved across overlays and mode changes
When `maximizedPanel` is not `null` and the user opens an overlay (help via `?`, file load via `o`), the `maximizedPanel` state SHALL be preserved. When the overlay is dismissed, the fullscreen view SHALL be restored.

#### Scenario: Help overlay over fullscreen
- **WHEN** `maximizedPanel` is `'response'` and the user presses `?`
- **THEN** `showHelp` SHALL become `true` and `maximizedPanel` SHALL remain `'response'`
- **AND** when the help overlay is closed, the fullscreen response panel SHALL be rendered again

#### Scenario: File load overlay over fullscreen
- **WHEN** `maximizedPanel` is `'requests'` and the user presses `o`
- **THEN** `mode` SHALL become `'fileLoad'` and `maximizedPanel` SHALL remain `'requests'`
- **AND** when the file load is completed or canceled, the fullscreen request panel SHALL be rendered again

#### Scenario: Search mode in fullscreen
- **WHEN** `maximizedPanel` is `'response'` and the user presses `/`
- **THEN** `mode` SHALL become `'search'` and `maximizedPanel` SHALL remain `'response'`
- **AND** search SHALL operate on the response content within the fullscreen panel