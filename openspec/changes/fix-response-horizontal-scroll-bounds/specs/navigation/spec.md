## MODIFIED Requirements

### Requirement: SCROLL_HORIZONTAL action
The system SHALL define a `SCROLL_HORIZONTAL` action type with `direction: 'left' | 'right'` and an optional `columns` field in the `Action` union type. The reducer SHALL clamp the horizontal offset to an upper bound so that scrolling right stops when the last character of the longest content line reaches the right edge of the visible panel width.

#### Scenario: Scroll right on focused panel
- **WHEN** the user presses `→` or `l` and the focused panel is `requests`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'right', columns }` where `columns` is the current terminal width, and the reducer SHALL increment `requestHorizontalOffset` by `2`, clamped to a maximum of `max(0, maxRequestLineWidth - requestContentWidth)`

#### Scenario: Scroll left on focused panel
- **WHEN** the user presses `←` or `h`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'left' }` and the reducer SHALL decrement the focused panel's horizontal offset by `2`, clamped to a minimum of `0`

#### Scenario: Scroll right on response panel
- **WHEN** the user presses `→` or `l` and the focused panel is `response`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'right', columns }` where `columns` is the current terminal width, and the reducer SHALL increment `responseHorizontalOffset` by `2`, clamped to a maximum of `max(0, maxResponseLineWidth - responseContentWidth)`

#### Scenario: Scroll left on response panel
- **WHEN** the user presses `←` or `h` and the focused panel is `response`
- **THEN** the system SHALL decrement `responseHorizontalOffset` by `2`, clamped to a minimum of `0`

#### Scenario: Scroll right stops when content right edge is within panel
- **WHEN** the horizontal offset equals or exceeds `maxLineWidth - contentWidth`
- **AND** the user presses `→` or `l`
- **THEN** the horizontal offset SHALL NOT increase further; it SHALL be clamped to `max(0, maxLineWidth - contentWidth)`

#### Scenario: Max line width for request panel
- **WHEN** computing the upper bound for `requestHorizontalOffset`
- **THEN** `maxRequestLineWidth` SHALL be the length of the longest formatted request line (prefix + padded method + target path) across all requests, and `requestContentWidth` SHALL be `max(10, leftPanelWidth - 4)` where `leftPanelWidth` is `clamp(floor(columns * 0.3), 25, 36)`

#### Scenario: Max line width for response panel
- **WHEN** computing the upper bound for `responseHorizontalOffset`
- **THEN** `maxResponseLineWidth` SHALL be the length of the longest line across the status line, header lines (if verbose mode is on), and the **formatted** body lines, where the formatted body lines SHALL be the lines of `formatResponseBody(response.body, rawMode)` — the same string the `ResponseView` component renders. `responseContentWidth` SHALL be `max(20, columns - leftPanelWidth - 6)` where `leftPanelWidth` is `clamp(floor(columns * 0.3), 25, 36)`

#### Scenario: Max line width for response panel uses formatted body in non-raw mode
- **WHEN** `rawMode` is `false` and `response.body` is compact JSON (a single line whose length exceeds the content width) that `formatResponseBody` expands into multiple shorter indented lines
- **AND** the upper bound for `responseHorizontalOffset` is computed
- **THEN** `maxResponseLineWidth` SHALL be derived from the expanded (formatted) body lines, NOT from the raw `response.body` lines
- **AND** the resulting `max(0, maxResponseLineWidth - responseContentWidth)` SHALL be small enough that every rendered line remains visible when `responseHorizontalOffset` is set to that bound

#### Scenario: Max line width for response panel uses raw body in raw mode
- **WHEN** `rawMode` is `true`
- **THEN** `formatResponseBody(response.body, true)` SHALL return `response.body` unchanged, so `maxResponseLineWidth` SHALL equal the longest raw body line length (no behavior change from before this fix)

#### Scenario: Empty or no content
- **WHEN** the panel has no content (no requests, or no response)
- **THEN** the horizontal offset SHALL be clamped to `0`

#### Scenario: Default columns value
- **WHEN** `columns` is not provided in the `SCROLL_HORIZONTAL` action
- **THEN** the reducer SHALL default `columns` to `80` for backward compatibility and testability
