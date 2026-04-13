## MODIFIED Requirements

### Requirement: SCROLL_HORIZONTAL action
The system SHALL define a `SCROLL_HORIZONTAL` action type with `direction: 'left' | 'right'` in the `Action` union type. The reducer SHALL clamp the horizontal offset to an upper bound so that at least one character of the longest content line remains visible.

#### Scenario: Scroll right on focused panel
- **WHEN** the user presses `→` or `l` and the focused panel is `requests`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'right' }` and the reducer SHALL increment `requestHorizontalOffset` by `2`, clamped to a maximum of `maxRequestLineWidth - 1`

#### Scenario: Scroll left on focused panel
- **WHEN** the user presses `←` or `h`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'left' }` and the reducer SHALL decrement the focused panel's horizontal offset by `2`, clamped to a minimum of `0`

#### Scenario: Scroll right on response panel
- **WHEN** the user presses `→` or `l` and the focused panel is `response`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'right' }` and the reducer SHALL increment `responseHorizontalOffset` by `2`, clamped to a maximum of `maxResponseLineWidth - 1`

#### Scenario: Scroll left on response panel
- **WHEN** the user presses `←` or `h` and the focused panel is `response`
- **THEN** the system SHALL decrement `responseHorizontalOffset` by `2`, clamped to a minimum of `0`

#### Scenario: Scroll right stops when all content is scrolled away
- **WHEN** the horizontal offset equals or exceeds `maxLineWidth - 1`
- **AND** the user presses `→` or `l`
- **THEN** the horizontal offset SHALL NOT increase further

#### Scenario: Max line width for request panel
- **WHEN** computing the upper bound for `requestHorizontalOffset`
- **THEN** `maxRequestLineWidth` SHALL be the length of the longest formatted request line (prefix + padded method + target path) across all requests

#### Scenario: Max line width for response panel
- **WHEN** computing the upper bound for `responseHorizontalOffset`
- **THEN** `maxResponseLineWidth` SHALL be the length of the longest line across the status line, header lines (if verbose mode is on), and body lines

#### Scenario: Empty or no content
- **WHEN** the panel has no content (no requests, or no response)
- **THEN** the horizontal offset SHALL be clamped to `0`
