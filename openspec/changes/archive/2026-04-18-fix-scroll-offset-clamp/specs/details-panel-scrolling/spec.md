## MODIFIED Requirements

### Requirement: Vertical scrolling in request details panel
The request details panel SHALL support vertical scrolling when the panel is focused and the resolved request content (method line, URL, headers, body) exceeds the panel's visible height. Scrolling SHALL use `j/k` and `↑/↓` keys. The scroll offset SHALL be tracked as `detailsScrollOffset` in `AppState`. The scroll offset SHALL be clamped to `[0, maxOffset]` at the reducer level, where `maxOffset = Math.max(0, totalLines - visibleHeight)`. The `SCROLL` action for the details panel SHALL include a `maxOffset` payload computed in the component layer. The scroll offset SHALL never accumulate past the upper boundary — pressing `j` at the bottom SHALL be a no-op for the offset value.

#### Scenario: Scroll down through long request body
- **WHEN** `focusedPanel` is `details` and the resolved request body has more lines than the visible height, and the user presses `j` or `↓`
- **THEN** the panel content SHALL scroll down by one line, revealing hidden content below

#### Scenario: Scroll offset clamped at bottom
- **WHEN** `focusedPanel` is `details` and the details scroll offset is at the maximum value (`maxOffset = totalLines - visibleHeight`) and the user presses `j` or `↓`
- **THEN** the scroll offset SHALL remain at `maxOffset` (it SHALL NOT increase beyond `maxOffset`)

#### Scenario: Immediate upward scroll after bottoming out
- **WHEN** `focusedPanel` is `details` and the scroll offset is at `maxOffset`, the user presses `j` three extra times, then presses `k`
- **THEN** the scroll offset SHALL decrease by 1 from `maxOffset` (the user SHALL NOT need to "work off" the excess presses)

#### Scenario: Panel height remains stable during scrolling
- **WHEN** the user scrolls through the details panel content
- **THEN** the panel height SHALL remain constant regardless of the scroll offset — the visible line count SHALL never change for a given request