# Spec: Fullscreen Panel

## Purpose

Fullscreen panel mode allows any focused panel (requests, details, or response) to expand to fill the entire terminal area (minus the status bar), providing maximum viewing space for content inspection.

## Requirements

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
The system SHALL bind the `f` key in `useInput` to dispatch `TOGGLE_FULLSCREEN` when no overlay is open and the application is in normal mode. The shortcut entry SHALL have `description: 'Toggle fullscreen'`.

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

### Requirement: Fullscreen key whitelist
While a panel is maximized, normal-mode key handling SHALL honor only the keys listed below; every other normal-mode key binding SHALL be a silent no-op (no action dispatched, no overlay opened, no mode change, no status-bar message). This restriction takes precedence over keybinding requirements in other capability specs while a panel is maximized.

Permitted regardless of which panel is maximized:
- Navigation keys (`j`/`k`/arrow keys, `h`/`l`, `g`, `G`, `0`, `$`) acting on the maximized panel, as specified by the **navigation** spec
- `f` to toggle fullscreen off, and `Escape` with its priority (cancel an in-flight request first, then clear active search results while the response panel is maximized, otherwise exit fullscreen), as specified by the **navigation** spec
- `?` to open the help overlay over fullscreen
- `Ctrl+C` to exit the application, preserving the terminal convention that the interrupt key always terminates
- `q` to dismiss displayed search results, as specified by the **response-search** spec (the quit fallback is restricted — see the requirement below)

Permitted only while the response panel is maximized:
- The display toggles `v`, `r`, `w` — their effects (verbose headers, raw formatting, wrapping) render only in the response panel
- The search keys `/`, `n`, `N`

#### Scenario: Ctrl+C exits from fullscreen
- **WHEN** a panel is maximized and the user presses `Ctrl+C`
- **THEN** the application SHALL exit cleanly and restore the terminal

#### Scenario: Navigation keys act on the maximized panel
- **WHEN** the requests panel is maximized and the user presses `j` or `k`
- **THEN** the request selection SHALL move within the fullscreen request list
- **WHEN** the response panel is maximized and the user presses `G`
- **THEN** the response panel SHALL jump to its bottom

#### Scenario: Display toggles work while the response panel is maximized
- **WHEN** the response panel is maximized and the user presses `w`
- **THEN** the response panel SHALL toggle wrap mode and its title SHALL reflect the new mode

#### Scenario: Display toggles are no-ops outside response fullscreen
- **WHEN** the requests panel is maximized and the user presses `v`, `r`, or `w`
- **THEN** the display modes SHALL remain unchanged: after exiting fullscreen, the response panel SHALL render with the same verbose, raw, and wrap settings as before
- **WHEN** the details panel is maximized and the user presses `w`
- **THEN** the wrap setting SHALL remain unchanged after exiting fullscreen

#### Scenario: Search keys are no-ops outside response fullscreen
- **WHEN** the requests or details panel is maximized and the user presses `/`
- **THEN** the application SHALL remain in normal mode and no search bar SHALL appear
- **WHEN** the requests or details panel is maximized, search results are active, and the user presses `n` or `N`
- **THEN** the current match index SHALL remain unchanged

### Requirement: Action keys are no-ops in fullscreen
While any panel is maximized, the following keys SHALL be no-ops: `Enter` (send request), `s` (save response), `S` (save as .http), `p` (paste as curl), `y` (copy as curl), `o` (open file), `E` (switch environment), `e` (edit request), `R` (reload file), `Ctrl+S` (in-place save), and `Ctrl+G` (external editor handoff). They SHALL NOT perform their action, open an overlay, or trigger the unsaved-changes confirmation prompt while a panel is maximized. Their behavior outside fullscreen SHALL be unchanged.

#### Scenario: Enter does not send from a maximized response panel
- **WHEN** the response panel is maximized and the user presses `Enter`
- **THEN** no request SHALL be sent, no loading indicator SHALL appear, and the fullscreen view SHALL persist

#### Scenario: Enter does not send from a maximized request list
- **WHEN** the requests panel is maximized and the user presses `Enter`
- **THEN** no request SHALL be sent and the fullscreen view SHALL persist

#### Scenario: File load cannot be opened from fullscreen
- **WHEN** any panel is maximized and the user presses `o`
- **THEN** no file-load overlay SHALL appear and the fullscreen view SHALL persist

#### Scenario: External editor handoff cannot be triggered from fullscreen
- **WHEN** any panel is maximized and the user presses `Ctrl+G`
- **THEN** the terminal SHALL NOT be suspended, no external editor SHALL launch, and the fullscreen view SHALL persist

#### Scenario: Other action keys do nothing in fullscreen
- **WHEN** any panel is maximized and the user presses `s`, `S`, `p`, `y`, `E`, `e`, `R`, or `Ctrl+S`
- **THEN** no overlay or confirmation prompt SHALL appear, no file or clipboard operation SHALL occur, and the fullscreen view SHALL persist

### Requirement: The quit key does not quit from fullscreen
While any panel is maximized, pressing `q` SHALL NOT exit the application and SHALL NOT open the unsaved-changes confirmation prompt. When search results are displayed, `q` SHALL still dismiss them and leave the panel maximized, as specified by the **response-search** spec. Quitting from fullscreen requires `Ctrl+C`, or exiting fullscreen first via `Escape` or `f`.

#### Scenario: q without search results does not quit from fullscreen
- **WHEN** a panel is maximized, no search results are displayed, and the user presses `q`
- **THEN** the application SHALL NOT exit and the fullscreen view SHALL persist

#### Scenario: q with unsaved changes opens no prompt from fullscreen
- **WHEN** a panel is maximized, unsaved edits exist, no search results are displayed, and the user presses `q`
- **THEN** no confirmation prompt SHALL appear and the fullscreen view SHALL persist

#### Scenario: q quits after exiting fullscreen
- **WHEN** a panel is maximized, no search results are displayed, and the user presses `f` followed by `q`
- **THEN** the application SHALL exit

### Requirement: Escape exits fullscreen
In normal mode, when `maximizedPanel` is not `null` and the user presses `Escape`, the system SHALL dispatch `TOGGLE_FULLSCREEN` to exit fullscreen — except while the response panel is maximized and search state is active, where the first `Escape` SHALL clear the search state and leave the panel maximized, and only a subsequent `Escape` SHALL exit fullscreen. This check SHALL occur after the help overlay, file load, search mode, and in-flight cancel handlers. Clearing active search results takes priority over exiting fullscreen while the response panel is maximized; exiting fullscreen takes priority while any other panel is maximized.

#### Scenario: Escape exits fullscreen
- **WHEN** `maximizedPanel` is `'response'`, no search state is active, and the user presses `Escape` in normal mode
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched and `maximizedPanel` SHALL become `null`

#### Scenario: Escape does not enter fullscreen
- **WHEN** `maximizedPanel` is `null` and the user presses `Escape` in normal mode with no active search results
- **THEN** no `TOGGLE_FULLSCREEN` action SHALL be dispatched

#### Scenario: Escape priority over search result clearing
- **WHEN** `maximizedPanel` is `'response'` and there are active search results, and the user presses `Escape`
- **THEN** no `TOGGLE_FULLSCREEN` action SHALL be dispatched; the search state SHALL be cleared and the response panel SHALL remain maximized (a subsequent `Escape` exits fullscreen)
- **WHEN** `maximizedPanel` is `'requests'` and there are active search results, and the user presses `Escape`
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched (exiting fullscreen takes priority; the search results remain active and can be cleared by `Escape` after exiting fullscreen)

### Requirement: Tab is no-op in fullscreen
When `maximizedPanel` is not `null`, pressing `Tab` SHALL NOT dispatch `SWITCH_PANEL`. The `SWITCH_PANEL` action SHALL only be dispatched when `maximizedPanel` is `null`.

#### Scenario: Tab does nothing in fullscreen
- **WHEN** `maximizedPanel` is `'response'` and the user presses `Tab`
- **THEN** no `SWITCH_PANEL` action SHALL be dispatched and `focusedPanel` SHALL remain unchanged

#### Scenario: Tab works normally outside fullscreen
- **WHEN** `maximizedPanel` is `null` and the user presses `Tab`
- **THEN** a `SWITCH_PANEL` action SHALL be dispatched as usual

### Requirement: Toggle details is no-op in fullscreen
When any panel is maximized (`requests`, `details`, or `response`), pressing `d` SHALL be a no-op — `TOGGLE_REQUEST_DETAILS` SHALL NOT be dispatched and the details-panel visibility state SHALL remain unchanged. When no panel is maximized, pressing `d` SHALL dispatch `TOGGLE_REQUEST_DETAILS` as usual.

#### Scenario: Pressing d in fullscreen never changes the details state
- **WHEN** the requests panel is maximized, the details panel is hidden, and the user presses `d`
- **THEN** the details panel SHALL remain hidden after exiting fullscreen
- **WHEN** the details panel is maximized and the user presses `d`
- **THEN** the details panel SHALL remain maximized and visible

#### Scenario: Pressing d outside fullscreen toggles details normally
- **WHEN** no panel is maximized and the details panel is hidden
- **THEN** pressing `d` SHALL show the details panel

### Requirement: Fullscreen layout rendering
When `maximizedPanel` is not `null`, the `Layout` component SHALL render only the maximized panel at full terminal width and full terminal height minus one row for the status bar. The status bar SHALL remain visible at the bottom. The non-maximized panels SHALL NOT be rendered. The `PANEL_VERTICAL_CHROME` constant (value: 3) represents the vertical space consumed by a panel's border top, title, and border bottom rows. Fullscreen panels SHALL subtract this chrome from their available height/visible count to prevent content overflow from pushing the panel title off-screen.

#### Scenario: Fullscreen response panel renders full width
- **WHEN** `maximizedPanel` is `'response'`
- **THEN** the `ResponseView` component SHALL be rendered with `availableHeight` equal to `rows - 1` (full content area) and `contentWidthOverride` set to the full terminal width minus `RESPONSE_PANEL_CHROME`, and the `RequestList` and `RequestDetailsView` components SHALL NOT be rendered

#### Scenario: Fullscreen requests panel renders with correct visible height
- **WHEN** `maximizedPanel` is `'requests'`
- **THEN** the `RequestList` component SHALL be rendered with `contentWidthOverride` set to the full terminal width minus `REQUEST_PANEL_CHROME`, `visibleHeightOverride` set to `rows - 1 - PANEL_VERTICAL_CHROME` (full content area minus panel border and title), and the `ResponseView` and `RequestDetailsView` components SHALL NOT be rendered

#### Scenario: Fullscreen details panel renders with correct max height
- **WHEN** `maximizedPanel` is `'details'`
- **THEN** the `RequestDetailsView` component SHALL be rendered with `contentWidthOverride` set to the full terminal width minus `RESPONSE_PANEL_CHROME`, `maxHeight` set to `rows - 1 - PANEL_VERTICAL_CHROME` (full content area minus panel border and title, reserving room for potential scroll indicator), and the `RequestList` and `ResponseView` components SHALL NOT be rendered

#### Scenario: Fullscreen panel titles remain visible
- **WHEN** `maximizedPanel` is `'requests'` and the request list has many items
- **THEN** the "Requests" title SHALL remain visible at the top of the fullscreen panel (content SHALL NOT overflow the bordered box)
- **WHEN** `maximizedPanel` is `'details'` and the request details have many lines
- **THEN** the "Request Details" title SHALL remain visible at the top of the fullscreen panel (content SHALL NOT overflow the bordered box)

### Requirement: Fullscreen state preserved across overlays and mode changes
When a panel is maximized and the user opens the help overlay (`?`) or enters search mode from a maximized response panel (`/`), the `maximizedPanel` state SHALL be preserved. When the overlay is dismissed or the mode returns to normal, the fullscreen view SHALL be restored. The file-load overlay can no longer be opened while a panel is maximized (`o` is restricted — see the action-keys requirement above); entering file load from normal mode and later maximizing a panel is unaffected.

#### Scenario: Help overlay over fullscreen
- **WHEN** a panel is maximized and the user presses `?`
- **THEN** the help overlay SHALL open and `maximizedPanel` SHALL be unchanged
- **AND** when the help overlay is closed, the fullscreen panel SHALL be rendered again

#### Scenario: File load overlay over fullscreen
- **WHEN** a panel is maximized and the user presses `o`
- **THEN** no file-load overlay SHALL appear and the fullscreen panel SHALL remain rendered

#### Scenario: Search mode in fullscreen
- **WHEN** the response panel is maximized and the user presses `/`
- **THEN** the mode SHALL become `'search'` and `maximizedPanel` SHALL remain `'response'`
- **AND** search SHALL operate on the response content within the fullscreen panel
- **WHEN** the requests or details panel is maximized and the user presses `/`
- **THEN** the mode SHALL remain `'normal'` and the fullscreen panel SHALL remain rendered