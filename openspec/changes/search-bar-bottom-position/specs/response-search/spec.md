## MODIFIED Requirements

### Requirement: Inline search bar display
When in search mode, `ResponseView` SHALL display a search bar pinned to the bottom edge of the response panel, showing `/` followed by the current query and a cursor indicator. The search bar SHALL always render at the bottom of the panel regardless of how much response content is visible — it SHALL NOT float after the last content line. When in normal mode with active matches (non-empty `searchMatches`), the search bar SHALL show the last query and the current match position as `[currentMatchIndex+1/totalMatches]`. The response body content SHALL occupy all remaining vertical space above the search bar using a flex-growing container.

#### Scenario: Search bar during input
- **WHEN** the app is in search mode with query `'john'`
- **THEN** the search bar SHALL display `/john_` (with `_` as cursor)
- **AND** the search bar SHALL be rendered at the bottom edge of the response panel

#### Scenario: Search bar with active matches
- **WHEN** the app is in normal mode with `lastSearchQuery` = `'john'`, `currentMatchIndex` = `1`, and `searchMatches.length` = `3`
- **THEN** the search bar SHALL display `/john [2/3]`
- **AND** the search bar SHALL be rendered at the bottom edge of the response panel

#### Scenario: Search bar with no matches after search
- **WHEN** the app is in normal mode with `lastSearchQuery` = `'xyz'` and `searchMatches.length` = `0`
- **THEN** the search bar SHALL display `/xyz [No matches]`
- **AND** the search bar SHALL be rendered at the bottom edge of the response panel

#### Scenario: No search bar when no search state
- **WHEN** `lastSearchQuery` is empty and the app is in normal mode
- **THEN** no search bar SHALL be displayed
- **AND** the response body content SHALL fill the full available height

#### Scenario: Search bar position with short response content
- **WHEN** the response body has fewer lines than the panel height and search mode is active
- **THEN** the search bar SHALL still render at the bottom edge of the panel
- **AND** the space between the last content line and the search bar SHALL be empty (filled by the flex-growing content container)

#### Scenario: Search bar position with long response content
- **WHEN** the response body has more lines than the panel height and search mode is active
- **THEN** the search bar SHALL render at the bottom edge of the panel
- **AND** the response content SHALL be scrollable above the search bar
- **AND** the visible content line count SHALL equal `availableHeight - RESPONSE_PANEL_VERTICAL_CHROME - searchBarHeight`
