## ADDED Requirements

### Requirement: Tab expansion in body rendering
The request details panel SHALL expand tab characters to spaces before rendering body content. Each tab character SHALL be replaced with the number of spaces needed to reach the next multiple of 8 from the current column position within the line. This ensures that line width calculations used for truncation and horizontal scrolling match the terminal's visual width, preventing content from overflowing the panel's bounds.

#### Scenario: Tab-indented body line renders within panel bounds
- **WHEN** the request details panel displays a body line containing tab characters (e.g., `\t\t\t\t<OutputClaim .../>`) and the panel is maximized to full terminal width
- **THEN** the tab characters SHALL be expanded to spaces before width calculation, and the rendered line SHALL NOT overflow past the panel's right border or produce stray border characters on adjacent lines

#### Scenario: Tab expansion preserves indentation structure
- **WHEN** a body line contains 4 tab characters at the start
- **THEN** the rendered line SHALL display 32 spaces of indentation (4 tabs × 8-column tab stops), preserving the visual indentation hierarchy of the body content

#### Scenario: Truncation accounts for expanded width
- **WHEN** a body line containing tabs has a string length that fits within `contentWidth` but the expanded visual width exceeds `contentWidth`
- **THEN** the line SHALL be truncated with `…` at `contentWidth` after tab expansion, rather than passing through untruncated and overflowing the terminal

#### Scenario: Non-tab body content unaffected
- **WHEN** a body line contains no tab characters
- **THEN** the rendering SHALL be identical to the behavior before this change (no expansion needed, no visual difference)

#### Scenario: Tab expansion applied before horizontal scrolling
- **WHEN** the user scrolls the details panel horizontally and the body line contains tab characters
- **THEN** the horizontal offset SHALL slice into the space-expanded string, so each column of offset corresponds to one visual column in the terminal
