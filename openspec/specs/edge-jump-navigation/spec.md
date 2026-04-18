# edge-jump-navigation Specification

## Purpose
TBD - created by archiving change add-panel-edge-jump-shortcuts. Update Purpose after archive.
## Requirements
### Requirement: JUMP_VERTICAL action
The system SHALL define a `JUMP_VERTICAL` action type in the `Action` union with `direction: 'start' | 'end'` and an optional `maxOffset: number` field. The reducer SHALL apply the action based on the currently focused panel:

- When `focusedPanel === 'requests'` and `direction === 'start'`: set `selectedIndex` to `0`, set `requestScrollOffset` via `getVisibleRequestOffset(0, requestScrollOffset)`, and reset `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` to `0`.
- When `focusedPanel === 'requests'` and `direction === 'end'`: set `selectedIndex` to `max(0, requests.length - 1)`, set `requestScrollOffset` via `getVisibleRequestOffset(lastIndex, requestScrollOffset)`, and reset `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` to `0`.
- When `focusedPanel === 'details'` and `direction === 'start'`: set `detailsScrollOffset` to `0`.
- When `focusedPanel === 'details'` and `direction === 'end'`: set `detailsScrollOffset` to `min(max(0, maxOffset), maxOffset)` where `maxOffset` is provided on the action payload; when `maxOffset` is not provided, `detailsScrollOffset` SHALL be left unchanged.
- When `focusedPanel === 'response'` and `direction === 'start'`: set `responseScrollOffset` to `0`.
- When `focusedPanel === 'response'` and `direction === 'end'`: set `responseScrollOffset` to the provided `maxOffset` value (clamped to `max(0, maxOffset)`); when `maxOffset` is not provided, `responseScrollOffset` SHALL be left unchanged.

No other state fields SHALL be modified by `JUMP_VERTICAL`.

#### Scenario: Jump to top of requests panel
- **WHEN** `focusedPanel` is `requests`, `selectedIndex` is greater than `0`, and a `JUMP_VERTICAL { direction: 'start' }` action is dispatched
- **THEN** `selectedIndex` SHALL become `0`
- **AND** `requestScrollOffset` SHALL be adjusted via `getVisibleRequestOffset(0, …)` so index `0` is visible
- **AND** `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` SHALL be `0`

#### Scenario: Jump to bottom of requests panel
- **WHEN** `focusedPanel` is `requests`, `requests.length` is `N` (with `N > 0`), and a `JUMP_VERTICAL { direction: 'end' }` action is dispatched
- **THEN** `selectedIndex` SHALL become `N - 1`
- **AND** `requestScrollOffset` SHALL be adjusted via `getVisibleRequestOffset(N - 1, …)` so the last request is visible
- **AND** `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` SHALL be `0`

#### Scenario: Jump to bottom when requests list is empty
- **WHEN** `focusedPanel` is `requests`, `requests.length` is `0`, and a `JUMP_VERTICAL { direction: 'end' }` action is dispatched
- **THEN** `selectedIndex` SHALL be clamped to `0`
- **AND** no error SHALL be thrown

#### Scenario: Jump to top of details panel
- **WHEN** `focusedPanel` is `details`, `detailsScrollOffset` is greater than `0`, and a `JUMP_VERTICAL { direction: 'start' }` action is dispatched
- **THEN** `detailsScrollOffset` SHALL become `0`
- **AND** `detailsHorizontalOffset` SHALL be unchanged

#### Scenario: Jump to bottom of details panel with maxOffset
- **WHEN** `focusedPanel` is `details` and a `JUMP_VERTICAL { direction: 'end', maxOffset: 25 }` action is dispatched
- **THEN** `detailsScrollOffset` SHALL become `25`

#### Scenario: Jump to top of response panel
- **WHEN** `focusedPanel` is `response`, `responseScrollOffset` is greater than `0`, and a `JUMP_VERTICAL { direction: 'start' }` action is dispatched
- **THEN** `responseScrollOffset` SHALL become `0`
- **AND** `responseHorizontalOffset` SHALL be unchanged

#### Scenario: Jump to bottom of response panel with maxOffset
- **WHEN** `focusedPanel` is `response` and a `JUMP_VERTICAL { direction: 'end', maxOffset: 100 }` action is dispatched
- **THEN** `responseScrollOffset` SHALL become `100`

#### Scenario: Jump to bottom without maxOffset leaves offset unchanged
- **WHEN** `focusedPanel` is `response`, `responseScrollOffset` is `12`, and a `JUMP_VERTICAL { direction: 'end' }` action is dispatched with no `maxOffset` field
- **THEN** `responseScrollOffset` SHALL remain `12` (the reducer SHALL NOT guess a bound)

### Requirement: JUMP_HORIZONTAL action
The system SHALL define a `JUMP_HORIZONTAL` action type in the `Action` union with `direction: 'start' | 'end'` and an optional `columns: number` field. The reducer SHALL apply the action based on the currently focused panel:

- When `focusedPanel === 'response'` and `wrapMode === 'wrap'`: return state unchanged (mirrors the existing `SCROLL_HORIZONTAL` guard).
- When `focusedPanel === 'requests'` and `direction === 'start'`: set `requestHorizontalOffset` to `0`.
- When `focusedPanel === 'requests'` and `direction === 'end'`: set `requestHorizontalOffset` to `max(0, getMaxRequestLineWidth(requests) - getRequestContentWidth(columns ?? 80))`.
- When `focusedPanel === 'details'` and `direction === 'start'`: set `detailsHorizontalOffset` to `0`.
- When `focusedPanel === 'details'` and `direction === 'end'`: set `detailsHorizontalOffset` to `max(0, getMaxDetailsLineWidth(state) - getResponseContentWidth(columns ?? 80))`.
- When `focusedPanel === 'response'` (and wrap mode is NOT `'wrap'`) and `direction === 'start'`: set `responseHorizontalOffset` to `0`.
- When `focusedPanel === 'response'` (and wrap mode is NOT `'wrap'`) and `direction === 'end'`: set `responseHorizontalOffset` to `max(0, getMaxResponseLineWidth(state) - getResponseContentWidth(columns ?? 80))`.

No other state fields SHALL be modified by `JUMP_HORIZONTAL`.

#### Scenario: Jump to horizontal start of requests panel
- **WHEN** `focusedPanel` is `requests`, `requestHorizontalOffset` is `12`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of requests panel
- **WHEN** `focusedPanel` is `requests`, `requests` contain at least one entry whose formatted line width exceeds `getRequestContentWidth(columns)`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `max(0, getMaxRequestLineWidth(requests) - getRequestContentWidth(columns))`

#### Scenario: Jump to horizontal start of details panel
- **WHEN** `focusedPanel` is `details`, `detailsHorizontalOffset` is greater than `0`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `detailsHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of details panel
- **WHEN** `focusedPanel` is `details` and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `detailsHorizontalOffset` SHALL become `max(0, getMaxDetailsLineWidth(state) - getResponseContentWidth(columns))`

#### Scenario: Jump to horizontal start of response panel
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'nowrap'`, `responseHorizontalOffset` is greater than `0`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `responseHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of response panel
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'nowrap'`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `responseHorizontalOffset` SHALL become `max(0, getMaxResponseLineWidth(state) - getResponseContentWidth(columns))`

#### Scenario: Jump to horizontal edge is no-op when response wrap mode is active
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'wrap'`, and either `JUMP_HORIZONTAL { direction: 'start' }` or `JUMP_HORIZONTAL { direction: 'end' }` is dispatched
- **THEN** the reducer SHALL return state unchanged

#### Scenario: Default columns value
- **WHEN** `JUMP_HORIZONTAL { direction: 'end' }` is dispatched without a `columns` field
- **THEN** the reducer SHALL default `columns` to `80` for backward compatibility and testability

#### Scenario: Jump to horizontal end clamped to zero when content fits
- **WHEN** `focusedPanel` is `requests` and `getMaxRequestLineWidth(requests)` is less than or equal to `getRequestContentWidth(columns)`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `0` (clamped lower bound)

### Requirement: Keyboard bindings for edge-jump navigation
The system SHALL bind the following keys in `useInput` (when no overlay is open and the application is in normal mode):

- `g` SHALL dispatch `{ type: 'JUMP_VERTICAL', direction: 'start' }`.
- `G` (Shift+g) SHALL dispatch `{ type: 'JUMP_VERTICAL', direction: 'end', maxOffset }` where `maxOffset` is computed by the component layer using the existing vertical-bound helpers (`getResponseTotalLines`, `getDetailsTotalLines`, `getMaxScrollOffset`) and the current terminal dimensions; when `focusedPanel === 'requests'`, `maxOffset` MAY be omitted (the reducer derives the bound from `requests.length`).
- `0` SHALL dispatch `{ type: 'JUMP_HORIZONTAL', direction: 'start', columns }` where `columns` is the current terminal width.
- `$` SHALL dispatch `{ type: 'JUMP_HORIZONTAL', direction: 'end', columns }` where `columns` is the current terminal width.

The handlers SHALL NOT fire when the help overlay is open or when the application is in `'fileLoad'` mode.

#### Scenario: Pressing g in normal mode
- **WHEN** the application is in normal mode, no overlay is open, and the user presses `g`
- **THEN** a `JUMP_VERTICAL { direction: 'start' }` action SHALL be dispatched

#### Scenario: Pressing G in normal mode
- **WHEN** the application is in normal mode, no overlay is open, and the user presses `G` (Shift+g)
- **THEN** a `JUMP_VERTICAL { direction: 'end', maxOffset }` action SHALL be dispatched with `maxOffset` computed from the focused panel's content metrics and visible height

#### Scenario: Pressing 0 in normal mode
- **WHEN** the application is in normal mode, no overlay is open, and the user presses `0`
- **THEN** a `JUMP_HORIZONTAL { direction: 'start', columns }` action SHALL be dispatched

#### Scenario: Pressing $ in normal mode
- **WHEN** the application is in normal mode, no overlay is open, and the user presses `$`
- **THEN** a `JUMP_HORIZONTAL { direction: 'end', columns }` action SHALL be dispatched

#### Scenario: Edge-jump keys are inert while help overlay is open
- **WHEN** the help overlay is visible and the user presses `g`, `G`, `0`, or `$`
- **THEN** no edge-jump action SHALL be dispatched

#### Scenario: Edge-jump keys are inert while file-load overlay is open
- **WHEN** the application is in `fileLoad` mode and the user presses `g`, `G`, `0`, or `$`
- **THEN** no edge-jump action SHALL be dispatched
- **AND** the character SHALL be appended to the file-load input text (existing file-load handler behavior)

### Requirement: Edge-jump navigation works across panel focus changes
Edge-jump shortcuts SHALL always target the currently focused panel. After switching panels via Tab, subsequent edge-jump presses SHALL act on the newly focused panel.

#### Scenario: Edge jump after Tab to details
- **WHEN** the user has Tab'd from `requests` to `details`, then presses `G`
- **THEN** the dispatched `JUMP_VERTICAL { direction: 'end', maxOffset }` SHALL affect `detailsScrollOffset` (not `requestScrollOffset`, not `responseScrollOffset`)

#### Scenario: Edge jump after Tab to response
- **WHEN** the user has Tab'd to `response`, then presses `$`
- **THEN** the dispatched `JUMP_HORIZONTAL { direction: 'end', columns }` SHALL affect `responseHorizontalOffset`

