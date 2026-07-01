# Spec: Panel Navigation

## Purpose

Unified panel navigation and scrolling: horizontal scroll offset tracking, vertical edge-jump shortcuts, and keyboard bindings for moving content within all panels (RequestList, ResponseView, RequestDetails).

## Requirements

### Requirement: Horizontal scroll offset state
The system SHALL track horizontal scroll offsets for all panels via `requestHorizontalOffset: number`, `responseHorizontalOffset: number`, and `detailsHorizontalOffset: number` fields on `AppState`. All fields SHALL default to `0` in the initial state.

#### Scenario: Initial state has zero horizontal offsets
- **WHEN** the application starts
- **THEN** `requestHorizontalOffset` SHALL be `0`, `responseHorizontalOffset` SHALL be `0`, and `detailsHorizontalOffset` SHALL be `0`

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

### Requirement: JUMP_VERTICAL action
The system SHALL define a `JUMP_VERTICAL` action type in the `Action` union with `direction: 'start' | 'end'` and an optional `maxOffset: number` field. The reducer SHALL apply the action based on the currently focused panel:

- When `focusedPanel === 'requests'` and `direction === 'start'`: set `selectedIndex` to `0`, set `requestScrollOffset` via `clampScrollOffsetToCursor(0, requestScrollOffset)`, and reset `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` to `0`.
- When `focusedPanel === 'requests'` and `direction === 'end'`: set `selectedIndex` to `max(0, requests.length - 1)`, set `requestScrollOffset` via `clampScrollOffsetToCursor(lastIndex, requestScrollOffset)`, and reset `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` to `0`.
- When `focusedPanel === 'details'` and `direction === 'start'`: set `detailsScrollOffset` to `0`.
- When `focusedPanel === 'details'` and `direction === 'end'`: set `detailsScrollOffset` to `min(max(0, maxOffset), maxOffset)` where `maxOffset` is provided on the action payload; when `maxOffset` is not provided, `detailsScrollOffset` SHALL be left unchanged.
- When `focusedPanel === 'response'` and `direction === 'start'`: set `responseScrollOffset` to `0`.
- When `focusedPanel === 'response'` and `direction === 'end'`: set `responseScrollOffset` to the provided `maxOffset` value (clamped to `max(0, maxOffset)`); when `maxOffset` is not provided, `responseScrollOffset` SHALL be left unchanged.

No other state fields SHALL be modified by `JUMP_VERTICAL`.

#### Scenario: Jump to top of requests panel
- **WHEN** `focusedPanel` is `requests`, `selectedIndex` is greater than `0`, and a `JUMP_VERTICAL { direction: 'start' }` action is dispatched
- **THEN** `selectedIndex` SHALL become `0`
- **AND** `requestScrollOffset` SHALL be adjusted via `clampScrollOffsetToCursor(0, …)` so index `0` is visible
- **AND** `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` SHALL be `0`

#### Scenario: Jump to bottom of requests panel
- **WHEN** `focusedPanel` is `requests`, `requests.length` is `N` (with `N > 0`), and a `JUMP_VERTICAL { direction: 'end' }` action is dispatched
- **THEN** `selectedIndex` SHALL become `N - 1`
- **AND** `requestScrollOffset` SHALL be adjusted via `clampScrollOffsetToCursor(N - 1, …)` so the last request is visible
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
- When `focusedPanel === 'requests'` and `direction === 'end'`: set `requestHorizontalOffset` to `max(0, getMaxRequestLineWidth({ requests, variables, baseDir }) - getRequestContentWidth(columns ?? 80))`.
- When `focusedPanel === 'details'` and `direction === 'start'`: set `detailsHorizontalOffset` to `0`.
- When `focusedPanel === 'details'` and `direction === 'end'`: set `detailsHorizontalOffset` to `max(0, getMaxDetailsLineWidth({ request, variables }) - getResponseContentWidth(columns ?? 80))`.
- When `focusedPanel === 'response'` (and wrap mode is NOT `'wrap'`) and `direction === 'start'`: set `responseHorizontalOffset` to `0`.
- When `focusedPanel === 'response'` (and wrap mode is NOT `'wrap'`) and `direction === 'end'`: set `responseHorizontalOffset` to `max(0, getMaxResponseLineWidth({ response, verbose, rawMode }) - getResponseContentWidth(columns ?? 80))`.

The `getMaxRequestLineWidth`, `getMaxDetailsLineWidth`, and `getMaxResponseLineWidth` helpers SHALL be imported from `src/utils/scroll.ts` (not `src/core/reducer.ts`) and SHALL accept option bags, not `AppState` directly. `requests`, `variables`, and `baseDir` SHALL be derived from `state.requests`, `state.variables`, and `dirname(state.filePath)` respectively; `request`, `variables` from `state.requests[state.selectedIndex]` and `state.variables`; `response`, `verbose`, `rawMode` from the corresponding `state` fields.

No other state fields SHALL be modified by `JUMP_HORIZONTAL`.

#### Scenario: Jump to horizontal start of requests panel
- **WHEN** `focusedPanel` is `requests`, `requestHorizontalOffset` is `12`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of requests panel
- **WHEN** `focusedPanel` is `requests`, `requests` contain at least one entry whose formatted line width exceeds `getRequestContentWidth(columns)`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `max(0, getMaxRequestLineWidth({ requests, variables, baseDir }) - getRequestContentWidth(columns))`

#### Scenario: Jump to horizontal start of details panel
- **WHEN** `focusedPanel` is `details`, `detailsHorizontalOffset` is greater than `0`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `detailsHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of details panel
- **WHEN** `focusedPanel` is `details` and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `detailsHorizontalOffset` SHALL become `max(0, getMaxDetailsLineWidth({ request, variables }) - getResponseContentWidth(columns))`

#### Scenario: Jump to horizontal start of response panel
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'nowrap'`, `responseHorizontalOffset` is greater than `0`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `responseHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of response panel
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'nowrap'`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `responseHorizontalOffset` SHALL become `max(0, getMaxResponseLineWidth({ response, verbose, rawMode }) - getResponseContentWidth(columns))`

#### Scenario: Jump to horizontal edge is no-op when response wrap mode is active
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'wrap'`, and either `JUMP_HORIZONTAL { direction: 'start' }` or `JUMP_HORIZONTAL { direction: 'end' }` is dispatched
- **THEN** the reducer SHALL return state unchanged

#### Scenario: Default columns value
- **WHEN** `JUMP_HORIZONTAL { direction: 'end' }` is dispatched without a `columns` field
- **THEN** the reducer SHALL default `columns` to `80` for backward compatibility and testability

#### Scenario: Jump to horizontal end clamped to zero when content fits
- **WHEN** `focusedPanel` is `requests` and `getMaxRequestLineWidth({ requests, variables, baseDir })` is less than or equal to `getRequestContentWidth(columns)`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `0` (clamped lower bound)

### Requirement: Keyboard bindings for edge-jump navigation
The system SHALL bind the following keys in `useInput` (when no overlay is open and the application is in normal mode):

- `g` SHALL dispatch `{ type: 'JUMP_VERTICAL', direction: 'start' }`.
- `G` (Shift+g) SHALL dispatch `{ type: 'JUMP_VERTICAL', direction: 'end', maxOffset }` where `maxOffset` is computed by the component layer using the existing vertical-bound helpers (`getResponseTotalLines`, `getDetailsTotalLines`, `getMaxScrollOffset`) and the current terminal dimensions; when `focusedPanel === 'requests'`, `maxOffset` MAY be omitted (the reducer derives the bound from `requests.length`).
- `0` SHALL dispatch `{ type: 'JUMP_HORIZONTAL', direction: 'start', columns }` where `columns` is the current terminal width.
- `$` SHALL dispatch `{ type: 'JUMP_HORIZONTAL', direction: 'end', columns }` where `columns` is the current terminal width.
- `Tab` SHALL dispatch `{ type: 'SWITCH_PANEL' }` only when `maximizedPanel` is `null`. When `maximizedPanel` is not `null`, `Tab` SHALL be a no-op.

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

#### Scenario: Tab is no-op in fullscreen mode
- **WHEN** `maximizedPanel` is not `null` and the user presses `Tab`
- **THEN** no `SWITCH_PANEL` action SHALL be dispatched and `focusedPanel` SHALL remain unchanged

### Requirement: Escape key handling in normal mode
In addition to existing Escape behaviors (close help overlay, cancel file load, cancel search, clear search results), the system SHALL handle Escape to exit fullscreen mode. When the application is in normal mode and `maximizedPanel` is not `null`, pressing `Escape` SHALL dispatch `TOGGLE_FULLSCREEN`. This check SHALL occur after the overlay handlers and search mode handlers, but before the existing "clear active search results" Escape handler.

The full Escape priority chain in `useInput` SHALL be:
1. Help overlay open → dispatch `CLOSE_HELP`
2. File load mode → dispatch `CANCEL_FILE_LOAD`
3. Search mode → dispatch `CANCEL_SEARCH`
4. Normal mode with `maximizedPanel` not `null` → dispatch `TOGGLE_FULLSCREEN`
5. Normal mode with active search results → dispatch `CANCEL_SEARCH`

#### Scenario: Escape exits fullscreen in normal mode
- **WHEN** `maximizedPanel` is `'response'` and the user presses `Escape` in normal mode with no overlays
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched and fullscreen SHALL be exited

### Requirement: Edge-jump navigation works across panel focus changes
Edge-jump shortcuts SHALL always target the currently focused panel. After switching panels via Tab, subsequent edge-jump presses SHALL act on the newly focused panel.

#### Scenario: Edge jump after Tab to details
- **WHEN** the user has Tab'd from `requests` to `details`, then presses `G`
- **THEN** the dispatched `JUMP_VERTICAL { direction: 'end', maxOffset }` SHALL affect `detailsScrollOffset` (not `requestScrollOffset`, not `responseScrollOffset`)

#### Scenario: Edge jump after Tab to response
- **WHEN** the user has Tab'd to `response`, then presses `$`
- **THEN** the dispatched `JUMP_HORIZONTAL { direction: 'end', columns }` SHALL affect `responseHorizontalOffset`
