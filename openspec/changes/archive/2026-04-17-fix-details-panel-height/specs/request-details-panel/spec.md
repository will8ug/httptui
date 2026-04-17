## MODIFIED Requirements

### Requirement: Request details panel layout
The request details panel SHALL appear inside the right panel column, above the response view. When visible, the right column SHALL be a vertical flex container with the request details on top and the response view below. The panel height SHALL be content-driven (adapting to number of content lines) with a maximum of `maxContentLines` rows of content. The height calculation SHALL use `min(totalContentLines, maxContentLines) + BORDER_ROWS`, matching the slice-based rendering model used by the component.

#### Scenario: Panel height matches rendered content
- **WHEN** the request details panel is visible
- **THEN** the panel height allocated by Layout SHALL equal `min(totalContentLines, maxContentLines) + BORDER_ROWS`, where `totalContentLines` is the full count of title, method/URL, separators, headers, and body lines

#### Scenario: Panel height stable during scrolling
- **WHEN** the user scrolls the details panel
- **THEN** the panel height SHALL not change — the Layout allocation is based on total content and max, not on the current scroll offset
