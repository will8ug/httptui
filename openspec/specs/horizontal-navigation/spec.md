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
The system SHALL define a `SCROLL_HORIZONTAL` action type with `direction: 'left' | 'right'` in the `Action` union type.

#### Scenario: Scroll right on focused panel
- **WHEN** the user presses `→` or `l` and the focused panel is `requests`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'right' }` and the reducer SHALL increment `requestHorizontalOffset` by `2`

#### Scenario: Scroll left on focused panel
- **WHEN** the user presses `←` or `h`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'left' }` and the reducer SHALL decrement the focused panel's horizontal offset by `2`, clamped to a minimum of `0`

#### Scenario: Scroll right on response panel
- **WHEN** the user presses `→` or `l` and the focused panel is `response`
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'right' }` and the reducer SHALL increment `responseHorizontalOffset` by `2`

#### Scenario: Scroll left on response panel
- **WHEN** the user presses `←` or `h` and the focused panel is `response`
- **THEN** the system SHALL decrement `responseHorizontalOffset` by `2`, clamped to a minimum of `0`

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