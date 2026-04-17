## MODIFIED Requirements

### Requirement: Request details panel layout
The request details panel SHALL appear inside the right panel column, above the response view. When visible, the right column SHALL be a vertical flex container with the request details on top and the response view below. The panel height SHALL be content-driven (adapting to number of headers/body lines) with a maximum of approximately 10 rows. When content exceeds the visible height, the panel SHALL support vertical scrolling instead of truncating with an ellipsis.

#### Scenario: Panel appears above response view
- **WHEN** the user toggles the request details panel on
- **THEN** the panel SHALL render at the top of the right column, pushing the response view downward

#### Scenario: Long request body is scrollable
- **WHEN** the resolved request body exceeds the panel's maximum visible height
- **THEN** the panel SHALL allow the user to scroll through the content using `j/k` or `↑/↓` keys, and SHALL display a scroll position indicator

#### Scenario: Panel hidden restores full response view
- **WHEN** the user toggles the request details panel off
- **THEN** the response view SHALL expand to occupy the full right column height
