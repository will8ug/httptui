## MODIFIED Requirements

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
