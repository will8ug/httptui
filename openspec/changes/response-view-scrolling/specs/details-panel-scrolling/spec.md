## ADDED Requirements

### Requirement: Vertical scrolling in request details panel
The request details panel SHALL support vertical scrolling when the resolved request content (method line, URL, headers, body) exceeds the panel's visible height. Scrolling SHALL use the same `j/k` and `↑/↓` keys that control response panel scrolling. The scroll offset SHALL be tracked as `detailsScrollOffset` in `AppState`.

#### Scenario: Scroll down through long request body
- **WHEN** the request details panel is visible and the resolved request body has more lines than the visible height, and the user presses `j` or `↓`
- **THEN** the panel content SHALL scroll down by one line, revealing hidden content below

#### Scenario: Scroll up after scrolling down
- **WHEN** the user has scrolled down in the details panel and presses `k` or `↑`
- **THEN** the panel content SHALL scroll up by one line

#### Scenario: Scroll offset clamped at top
- **WHEN** the details scroll offset is 0 and the user presses `k` or `↑`
- **THEN** the scroll offset SHALL remain at 0 (no negative scrolling)

#### Scenario: Scroll offset clamped at bottom
- **WHEN** the details scroll offset is at the maximum value (total content lines minus visible height) and the user presses `j` or `↓`
- **THEN** the scroll offset SHALL not increase beyond the maximum

#### Scenario: Content fits within panel height
- **WHEN** the request details panel is visible and the total content lines fit within the visible height
- **THEN** scrolling keys SHALL have no visible effect on the details panel content

### Requirement: Scroll routing when details panel is visible
When the request details panel is visible and the response panel has focus (`focusedPanel === 'response'`), the `SCROLL` action SHALL update `detailsScrollOffset` instead of `responseScrollOffset`. The response panel SHALL not scroll while the details panel is open.

#### Scenario: Arrow keys scroll details panel instead of response
- **WHEN** `showRequestDetails` is true and `focusedPanel` is `response` and the user presses `j`
- **THEN** the system SHALL increment `detailsScrollOffset` (not `responseScrollOffset`)

#### Scenario: Closing details panel restores response scrolling
- **WHEN** the user presses `d` to hide the details panel and then presses `j`
- **THEN** the system SHALL increment `responseScrollOffset` as normal

### Requirement: Details scroll offset reset on state transitions
The `detailsScrollOffset` SHALL be reset to 0 on the following state transitions: toggling the details panel off (`TOGGLE_REQUEST_DETAILS` when `showRequestDetails` becomes false), changing the selected request (`MOVE_SELECTION`, `SELECT_REQUEST`), reloading the file (`RELOAD_FILE`), and loading a new file (`LOAD_FILE`).

#### Scenario: Reset on toggle off
- **WHEN** the user has scrolled the details panel and presses `d` to hide it
- **THEN** `detailsScrollOffset` SHALL be reset to 0

#### Scenario: Reset on selection change
- **WHEN** the user has scrolled the details panel and moves to a different request with `k` or `j` (in the request list)
- **THEN** `detailsScrollOffset` SHALL be reset to 0

#### Scenario: Reset on file reload
- **WHEN** the user has scrolled the details panel and presses `R` to reload
- **THEN** `detailsScrollOffset` SHALL be reset to 0

#### Scenario: Reset on file load
- **WHEN** the user has scrolled the details panel and loads a new file via `o`
- **THEN** `detailsScrollOffset` SHALL be reset to 0

### Requirement: Scroll position indicator
When the request details panel content exceeds the visible height, the panel SHALL display a scroll position indicator showing the user's position within the content.

#### Scenario: Indicator shown when content overflows
- **WHEN** the details panel has more content lines than the visible window
- **THEN** the panel SHALL display an indicator in dim text showing current scroll position relative to total lines (e.g., `↕ 1/25 lines`)

#### Scenario: Indicator hidden when content fits
- **WHEN** the details panel content fits entirely within the visible height
- **THEN** no scroll position indicator SHALL be displayed
