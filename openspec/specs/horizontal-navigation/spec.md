# Spec: Horizontal Navigation

## Overview

Horizontal scroll offset tracking and rendering for both RequestList and ResponseView panels, allowing users to view truncated content by scrolling left/right within the focused panel.

## Requirements

### Requirement: Horizontal scroll offset state
The system SHALL track horizontal scroll offsets for both panels via `requestHorizontalOffset: number` and `responseHorizontalOffset: number` fields on `AppState`. Both fields SHALL default to `0` in the initial state.

#### Scenario: Initial state has zero horizontal offsets
- **WHEN** the application starts
- **THEN** `requestHorizontalOffset` SHALL be `0` and `responseHorizontalOffset` SHALL be `0`

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
- **THEN** `maxResponseLineWidth` SHALL be the length of the longest line across the status line, header lines (if verbose mode is on), and body lines, and `responseContentWidth` SHALL be `max(20, columns - leftPanelWidth - 6)` where `leftPanelWidth` is `clamp(floor(columns * 0.3), 25, 36)`

#### Scenario: Empty or no content
- **WHEN** the panel has no content (no requests, or no response)
- **THEN** the horizontal offset SHALL be clamped to `0`

#### Scenario: Default columns value
- **WHEN** `columns` is not provided in the `SCROLL_HORIZONTAL` action
- **THEN** the reducer SHALL default `columns` to `80` for backward compatibility and testability

### Requirement: Horizontal offset resets on content change
The system SHALL reset `requestHorizontalOffset` to `0` when a `SELECT_REQUEST` or `MOVE_SELECTION` action is dispatched. The system SHALL reset `responseHorizontalOffset` to `0` when a `SEND_REQUEST` action is dispatched.

#### Scenario: Selecting a different request resets request offset
- **WHEN** the user selects a different request (via `j`/`k`/`↑`/`↓` or direct `SELECT_REQUEST`)
- **THEN** `requestHorizontalOffset` SHALL be set to `0`

#### Scenario: Sending a request resets response offset
- **WHEN** the user sends a request (presses Enter)
- **THEN** `responseHorizontalOffset` SHALL be set to `0`

### Requirement: RequestList renders with horizontal offset
The `RequestList` component SHALL accept a `horizontalOffset` prop and render each request line as a substring starting from `horizontalOffset`, truncated to the available panel width.

#### Scenario: RequestList with zero offset
- **WHEN** `horizontalOffset` is `0`
- **THEN** the component SHALL render identically to current behavior (no visible change)

#### Scenario: RequestList with positive offset
- **WHEN** `horizontalOffset` is greater than `0`
- **THEN** each line of request content (method label and target path) SHALL be shifted left by `horizontalOffset` characters, with the visible portion truncated to the panel width

### Requirement: ResponseView renders with horizontal offset
The `ResponseView` component SHALL accept a `horizontalOffset` prop and render each line of response content (status line, headers, separator, body lines) as a substring starting from `horizontalOffset`, truncated to the available content width.

#### Scenario: ResponseView with zero offset
- **WHEN** `horizontalOffset` is `0`
- **THEN** the component SHALL render identically to current behavior (no visible change)

#### Scenario: ResponseView with positive offset
- **WHEN** `horizontalOffset` is greater than `0`
- **THEN** each line of response content SHALL be shifted left by `horizontalOffset` characters, with the visible portion truncated to the content width