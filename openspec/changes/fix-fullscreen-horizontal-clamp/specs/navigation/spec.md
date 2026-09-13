## MODIFIED Requirements

### Requirement: SCROLL_HORIZONTAL action
The system SHALL define a `SCROLL_HORIZONTAL` action type with `direction: 'left' | 'right'` and an optional `columns` field in the `Action` union type. The reducer SHALL clamp the focused panel's horizontal offset to an upper bound so that scrolling right stops when the last character of the longest displayed line reaches the right edge of the panel's visible content area at its current layout: the split-layout content width in the normal view, and the fullscreen content width while that panel is maximized. The bound SHALL always be derived from the lines the panel actually displays, so that at the bound every displayed line of the panel is fully visible.

#### Scenario: Scroll right on focused panel
- **WHEN** the user presses `→` or `l` and the focused panel is `requests` in the normal view
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'right', columns }` where `columns` is the current terminal width, and the request list's horizontal offset SHALL increase by 2, stopping once the longest displayed request line's last character reaches the right edge of the request panel's content area

#### Scenario: Scroll left on focused panel
- **WHEN** the user presses `←` or `h`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'left' }` and the focused panel's horizontal offset SHALL decrease by 2, clamped to a minimum of `0`

#### Scenario: Scroll right on response panel
- **WHEN** the user presses `→` or `l` and the focused panel is `response` in the normal view
- **THEN** the response panel's horizontal offset SHALL increase by 2, stopping once the longest displayed response line's last character reaches the right edge of the response panel's split-layout content area

#### Scenario: Scroll left on response panel
- **WHEN** the user presses `←` or `h` and the focused panel is `response`
- **THEN** the response panel's horizontal offset SHALL decrease by 2, clamped to a minimum of `0`

#### Scenario: Scroll right stops when content right edge is within panel
- **WHEN** the horizontal offset equals the upper bound for the panel's current layout (split or fullscreen)
- **AND** the user presses `→` or `l`
- **THEN** the horizontal offset SHALL NOT increase further; it SHALL be clamped at the offset where the longest displayed line's last character reaches the right edge of the panel's content area at its current layout

#### Scenario: Fullscreen response panel clamps at fullscreen width
- **WHEN** the response panel is maximized, wrap mode is off, and the user scrolls right to the bound
- **THEN** scrolling SHALL stop exactly when the longest displayed line's last character meets the right edge of the maximized panel's content area — the bound SHALL use the fullscreen content width, not the narrower split-layout width

#### Scenario: Fullscreen requests panel clamps at fullscreen width
- **WHEN** the requests panel is maximized and the user scrolls right to the bound
- **THEN** scrolling SHALL stop exactly when the longest displayed request line's last character meets the right edge of the maximized panel's content area — the bound SHALL use the fullscreen content width, not the split-layout request width

#### Scenario: Fullscreen details panel clamps at fullscreen width
- **WHEN** the details panel is maximized and the user scrolls right to the bound
- **THEN** scrolling SHALL stop exactly when the longest displayed details line's last character meets the right edge of the maximized panel's content area — the bound SHALL use the fullscreen content width, not the narrower split-layout width

#### Scenario: Max line width for request panel
- **WHEN** the requests panel's upper bound is computed
- **THEN** the longest line SHALL be measured across the request lines as displayed in the list (the padded method label and target path) over all requests, in display cells

#### Scenario: Max line width for response panel
- **WHEN** the response panel's upper bound is computed
- **THEN** the longest line SHALL be measured across the status line, the header lines (when verbose mode is on), and the body lines as formatted for display, in display cells

#### Scenario: Max line width for response panel uses formatted body in non-raw mode
- **WHEN** `rawMode` is `false` and a compact single-line JSON body is expanded into multiple shorter indented lines for display
- **THEN** the bound SHALL be derived from the expanded display lines, so that at the bound every displayed line remains fully visible

#### Scenario: Max line width for response panel uses raw body in raw mode
- **WHEN** `rawMode` is `true`
- **THEN** the body SHALL be displayed unformatted, so the bound SHALL be derived from the raw body lines as-is

#### Scenario: Empty or no content
- **WHEN** the panel has no content (no requests, or no response)
- **THEN** the horizontal offset SHALL be clamped to `0`

#### Scenario: Default columns value
- **WHEN** `columns` is not provided in the `SCROLL_HORIZONTAL` action
- **THEN** the bound SHALL be computed as if the terminal were 80 columns wide in the current layout (split or fullscreen)

### Requirement: JUMP_HORIZONTAL action
The system SHALL define a `JUMP_HORIZONTAL` action type in the `Action` union with `direction: 'start' | 'end'` and an optional `columns: number` field. The reducer SHALL apply the action based on the currently focused panel:

- When `focusedPanel === 'response'` and `wrapMode === 'wrap'`: return state unchanged (mirrors the existing `SCROLL_HORIZONTAL` guard).
- When `direction === 'start'`: set the focused panel's horizontal offset to `0`.
- When `direction === 'end'`: set the focused panel's horizontal offset to the panel's upper bound — the offset at which the longest displayed line of that panel ends at the right edge of the panel's visible content area at its current layout (the split-layout content width in the normal view, the fullscreen content width while that panel is maximized). When the panel's content fits within its content width, the bound SHALL be `0`.

No other state fields SHALL be modified by `JUMP_HORIZONTAL`.

#### Scenario: Jump to horizontal start of requests panel
- **WHEN** `focusedPanel` is `requests`, `requestHorizontalOffset` is `12`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of requests panel
- **WHEN** `focusedPanel` is `requests` in the normal view, at least one displayed request line is wider than the request panel's split-layout content width, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become the offset at which the longest displayed request line's last character reaches the right edge of the request panel's content area

#### Scenario: Jump to horizontal end of maximized requests panel
- **WHEN** the requests panel is maximized and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become the offset at which the longest displayed request line's last character reaches the right edge of the maximized panel's content area

#### Scenario: Jump to horizontal start of details panel
- **WHEN** `focusedPanel` is `details`, `detailsHorizontalOffset` is greater than `0`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `detailsHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of details panel
- **WHEN** `focusedPanel` is `details` and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `detailsHorizontalOffset` SHALL become the offset at which the longest displayed details line's last character reaches the right edge of the details panel's content area at its current layout (split or fullscreen)

#### Scenario: Jump to horizontal start of response panel
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'nowrap'`, `responseHorizontalOffset` is greater than `0`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `responseHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of response panel
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'nowrap'`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `responseHorizontalOffset` SHALL become the offset at which the longest displayed response line's last character reaches the right edge of the response panel's content area at its current layout (split or fullscreen)

#### Scenario: Jump to horizontal edge is no-op when response wrap mode is active
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'wrap'`, and either `JUMP_HORIZONTAL { direction: 'start' }` or `JUMP_HORIZONTAL { direction: 'end' }` is dispatched
- **THEN** the reducer SHALL return state unchanged

#### Scenario: Default columns value
- **WHEN** `JUMP_HORIZONTAL { direction: 'end' }` is dispatched without a `columns` field
- **THEN** the bound SHALL be computed as if the terminal were 80 columns wide in the current layout (split or fullscreen)

#### Scenario: Jump to horizontal end clamped to zero when content fits
- **WHEN** `focusedPanel` is `requests` and every displayed request line fits within the request panel's content width at its current layout, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `0` (clamped lower bound)
