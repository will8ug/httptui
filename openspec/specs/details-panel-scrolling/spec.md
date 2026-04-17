## ADDED Requirements

### Requirement: Details panel focus via Tab cycling
The request details panel SHALL participate in the Tab focus cycle as a focusable panel. The `FocusedPanel` type SHALL be expanded to include `'details'` alongside `'requests'` and `'response'`. When `showRequestDetails` is true, Tab SHALL cycle: `requests → details → response → requests`. When `showRequestDetails` is false, Tab SHALL skip `'details'`: `requests → response → requests`.

#### Scenario: Tab from requests to details when panel is visible
- **WHEN** `showRequestDetails` is true and `focusedPanel` is `requests` and the user presses Tab
- **THEN** `focusedPanel` SHALL become `'details'`

#### Scenario: Tab from details to response
- **WHEN** `focusedPanel` is `details` and the user presses Tab
- **THEN** `focusedPanel` SHALL become `'response'`

#### Scenario: Tab from response wraps to requests
- **WHEN** `focusedPanel` is `response` and the user presses Tab
- **THEN** `focusedPanel` SHALL become `'requests'`

#### Scenario: Tab skips details when panel is hidden
- **WHEN** `showRequestDetails` is false and `focusedPanel` is `requests` and the user presses Tab
- **THEN** `focusedPanel` SHALL become `'response'` (skipping `'details'`)

### Requirement: Focus transitions on details panel toggle
When the details panel is toggled off while it has focus, the system SHALL move focus to the response panel. When the details panel is toggled on, focus SHALL remain on the current panel (the user must Tab to details intentionally).

#### Scenario: Toggle off while details focused
- **WHEN** `focusedPanel` is `details` and the user presses `d` to hide the details panel
- **THEN** `focusedPanel` SHALL become `'response'` and `showRequestDetails` SHALL become false

#### Scenario: Toggle on does not change focus
- **WHEN** `focusedPanel` is `requests` and the user presses `d` to show the details panel
- **THEN** `focusedPanel` SHALL remain `'requests'` and `showRequestDetails` SHALL become true

### Requirement: Visual focus indication for details panel
The request details panel SHALL display focus state using the same visual pattern as the request list and response panels: `borderColor` and title text color SHALL be `cyanBright` when focused and `gray` when unfocused.

#### Scenario: Details panel shows focused styling
- **WHEN** `focusedPanel` is `details`
- **THEN** the details panel border SHALL be `cyanBright` and the title text SHALL be `cyanBright`

#### Scenario: Details panel shows unfocused styling
- **WHEN** `focusedPanel` is not `details`
- **THEN** the details panel border SHALL be `gray` and the title text SHALL be `gray`

### Requirement: Vertical scrolling in request details panel
The request details panel SHALL support vertical scrolling when the panel is focused and the resolved request content (method line, URL, headers, body) exceeds the panel's visible height. Scrolling SHALL use `j/k` and `↑/↓` keys. The scroll offset SHALL be tracked as `detailsScrollOffset` in `AppState`. The scroll offset SHALL be clamped so that the number of visible lines remains constant — `slice(clampedOffset, clampedOffset + visibleHeight)` SHALL always return exactly `min(totalLines, visibleHeight)` lines.

#### Scenario: Scroll down through long request body
- **WHEN** `focusedPanel` is `details` and the resolved request body has more lines than the visible height, and the user presses `j` or `↓`
- **THEN** the panel content SHALL scroll down by one line, revealing hidden content below

#### Scenario: Scroll offset clamped at bottom
- **WHEN** `focusedPanel` is `details` and the details scroll offset is at the maximum value (`totalLines - visibleHeight`) and the user presses `j` or `↓`
- **THEN** the scroll offset SHALL not increase beyond the maximum, and the panel SHALL continue to display exactly `visibleHeight` lines

#### Scenario: Panel height remains stable during scrolling
- **WHEN** the user scrolls through the details panel content
- **THEN** the panel height SHALL remain constant regardless of the scroll offset — the visible line count SHALL never change for a given request

### Requirement: Horizontal scrolling in request details panel
The request details panel SHALL support horizontal scrolling when the panel is focused, using `h/l` and `←/→` keys. The horizontal offset SHALL be tracked as `detailsHorizontalOffset` in `AppState`.

#### Scenario: Scroll right to see long URL
- **WHEN** `focusedPanel` is `details` and the resolved URL exceeds the panel width, and the user presses `l` or `→`
- **THEN** the panel content SHALL shift left, revealing hidden content to the right

#### Scenario: Scroll left after scrolling right
- **WHEN** `focusedPanel` is `details` and the user has scrolled right and presses `h` or `←`
- **THEN** the panel content SHALL shift right

#### Scenario: Horizontal offset clamped at zero
- **WHEN** `focusedPanel` is `details` and the horizontal offset is 0 and the user presses `h` or `←`
- **THEN** the horizontal offset SHALL remain at 0

### Requirement: Details scroll offset reset on state transitions
Both `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0 on the following state transitions: toggling the details panel off (`TOGGLE_REQUEST_DETAILS` when hiding), changing the selected request (`MOVE_SELECTION`, `SELECT_REQUEST`), reloading the file (`RELOAD_FILE`), and loading a new file (`LOAD_FILE`).

#### Scenario: Reset on toggle off
- **WHEN** the user presses `d` to hide the details panel
- **THEN** `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0

#### Scenario: Reset on selection change
- **WHEN** the user moves to a different request with `k` or `j` (while request list is focused)
- **THEN** `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0

#### Scenario: Reset on file reload
- **WHEN** the user presses `R` to reload
- **THEN** `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0

#### Scenario: Reset on file load
- **WHEN** the user loads a new file via `o`
- **THEN** `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0

### Requirement: Scroll position indicator
When the request details panel content exceeds the visible height, the panel SHALL display a scroll position indicator showing the user's position within the content.

#### Scenario: Indicator shown when content overflows
- **WHEN** the details panel has more content lines than the visible window
- **THEN** the panel SHALL display an indicator in dim text showing current scroll position relative to total lines (e.g., `↕ 1/25 lines`)

#### Scenario: Indicator hidden when content fits
- **WHEN** the details panel content fits entirely within the visible height
- **THEN** no scroll position indicator SHALL be displayed

### Requirement: Enter sends request regardless of focused panel
The `Enter` key SHALL send the currently selected request regardless of which panel has focus. This existing behavior SHALL be preserved with the addition of the `'details'` focus state.

#### Scenario: Enter sends request when details focused
- **WHEN** `focusedPanel` is `details` and the user presses Enter
- **THEN** the system SHALL send the currently selected request
