## MODIFIED Requirements

### Requirement: Wrap mode rendering in response panel
When `wrapMode` is `'wrap'`, the response panel SHALL wrap long lines at the panel boundary instead of truncating them. Lines that exceed `contentWidth` SHALL continue on the next visual line, broken at word boundaries when possible, or at character boundaries for strings longer than `contentWidth` with no spaces. The status line SHALL preserve its structured color segments (gray `HTTP/1.1 ` prefix, status-code color on the code and status text, gray duration suffix) across wrap boundaries — the first wrapped visual line SHALL retain the gray `HTTP/1.1 ` prefix color when the segment falls on it, matching the non-wrapped rendering.

#### Scenario: Long line wraps in wrap mode
- **WHEN** `wrapMode` is `'wrap'` and a response line exceeds `contentWidth`
- **THEN** the line SHALL be split into multiple visual lines at `contentWidth` character boundaries, preferring word boundaries
- **AND** the visual lines SHALL be included in the scrollable content array for vertical scrolling

#### Scenario: Short line unchanged in wrap mode
- **WHEN** `wrapMode` is `'wrap'` and a response line fits within `contentWidth`
- **THEN** the line SHALL render identically to nowrap mode (no truncation, no wrapping)

#### Scenario: JSON colorization preserved in wrap mode
- **WHEN** `wrapMode` is `'wrap'` and a JSON response line wraps across multiple visual lines
- **THEN** each visual line SHALL preserve the color spans from `colorizeJson`, splitting segments at wrap boundaries while maintaining the correct color for each portion

#### Scenario: Nowrap mode rendering unchanged
- **WHEN** `wrapMode` is `'nowrap'`
- **THEN** the response panel SHALL render identically to the current behavior (truncate long lines with `…`, support horizontal scrolling)

#### Scenario: Status line gray prefix preserved on wrapped status
- **WHEN** `wrapMode` is `'wrap'` and the status line (`HTTP/1.1 <code> <statusText>  <ms>ms`) is longer than `contentWidth` and wraps to multiple visual lines
- **THEN** the gray `HTTP/1.1 ` segment SHALL render in gray on whichever visual line it falls on (the first line in typical cases)
- **AND** the status code and status text SHALL render in the status-code color (`getStatusColor(statusCode)`) on whichever visual line they fall on
- **AND** the gray duration suffix SHALL render in gray on whichever visual line it falls on
- **AND** the rendering SHALL NOT collapse to a single color across all wrapped lines (the previous behavior that rendered every wrapped status line in the status-code color, dropping the gray prefix, is NOT permitted)
