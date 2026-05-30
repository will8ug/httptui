## MODIFIED Requirements

### Requirement: Horizontal scrolling in request details panel
The request details panel SHALL support horizontal scrolling when the panel is focused, using `h/l` and `←/→` keys. The horizontal offset SHALL be tracked as `detailsHorizontalOffset` in `AppState`. When rendering with a non-zero horizontal offset, the panel SHALL slice each line of text by the offset and truncate the result to fit within the panel's available content width. The rendered text SHALL NOT extend beyond the panel's bounds into adjacent UI areas.

#### Scenario: Scroll right to see long URL without overflow
- **WHEN** `focusedPanel` is `details` and the resolved URL exceeds the panel width, and the user presses `l` or `→`
- **THEN** the panel content SHALL shift left, revealing hidden content to the right, AND the visible text SHALL be truncated to fit within the panel's content width

#### Scenario: Scroll left after scrolling right
- **WHEN** `focusedPanel` is `details` and the user has scrolled right and presses `h` or `←`
- **THEN** the panel content SHALL shift right

#### Scenario: Horizontal offset clamped at zero
- **WHEN** `focusedPanel` is `details` and the horizontal offset is 0 and the user presses `h` or `←`
- **THEN** the horizontal offset SHALL remain at 0

#### Scenario: No visual overflow during horizontal scroll
- **WHEN** `focusedPanel` is `details` and a request has very long lines (URL, headers, or body), and the user scrolls horizontally
- **THEN** NO content SHALL render outside the panel's right-column bounds, and NO content SHALL overlap the requests sidebar on the left
