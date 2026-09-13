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

#### Scenario: Scroll right stops at the panel's rendered width
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

#### Scenario: Bound uses the request lines as displayed
- **WHEN** the requests panel's upper bound is computed
- **THEN** the longest line SHALL be measured across the request lines as displayed in the list (the padded method label and target path) over all requests, in display cells

#### Scenario: Bound uses the response lines as displayed
- **WHEN** the response panel's upper bound is computed
- **THEN** the longest line SHALL be measured across the status line, the header lines (when verbose mode is on), and the body lines as formatted for display, in display cells

#### Scenario: Bound uses formatted body in non-raw mode
- **WHEN** `rawMode` is `false` and a compact single-line JSON body is expanded into multiple shorter indented lines for display
- **THEN** the bound SHALL be derived from the expanded display lines, so that at the bound every displayed line remains fully visible

#### Scenario: Bound uses raw body in raw mode
- **WHEN** `rawMode` is `true`
- **THEN** the body SHALL be displayed unformatted, so the bound SHALL be derived from the raw body lines as-is

#### Scenario: Empty or no content
- **WHEN** the panel has no content (no requests, or no response)
- **THEN** the horizontal offset SHALL be clamped to `0`

#### Scenario: Default width when none provided
- **WHEN** `columns` is not provided in the `SCROLL_HORIZONTAL` action
- **THEN** the bound SHALL be computed as if the terminal were 80 columns wide in the current layout (split or fullscreen)

### Requirement: Horizontal offset resets on content change
The system SHALL reset `requestHorizontalOffset` to `0` when a `SELECT_REQUEST` or `MOVE_SELECTION` action is dispatched. The system SHALL reset `responseHorizontalOffset` to `0` when a `SEND_REQUEST` action is dispatched.

#### Scenario: Selecting a different request resets request offset
- **WHEN** the user selects a different request (via `j`/`k`/`↑`/`↓` or direct `SELECT_REQUEST`)
- **THEN** `requestHorizontalOffset` SHALL be set to `0`

#### Scenario: Sending a request resets response offset
- **WHEN** the user sends a request (presses Enter)
- **THEN** `responseHorizontalOffset` SHALL be set to `0`

### Requirement: RequestList renders with horizontal offset
The `RequestList` component SHALL accept a `horizontalOffset` prop and render each request line sliced from `horizontalOffset` display cells onward, truncated to the available panel width in display cells. Slicing SHALL snap to grapheme-cluster boundaries so no character is split by the offset (display-cell semantics are specified in the **display-width** spec).

#### Scenario: RequestList with zero offset
- **WHEN** `horizontalOffset` is `0`
- **THEN** the component SHALL render identically to current behavior (no visible change)

#### Scenario: RequestList with positive offset
- **WHEN** `horizontalOffset` is greater than `0`
- **THEN** each line of request content (method label and target path) SHALL be shifted left by `horizontalOffset` display cells, with the visible portion truncated to the panel width in cells

#### Scenario: Offset does not split a wide character
- **WHEN** `horizontalOffset` lands between the two cells of a wide character in a request line
- **THEN** the slice SHALL start at the next grapheme-cluster boundary, keeping the wide character whole

### Requirement: ResponseView renders with horizontal offset
The `ResponseView` component SHALL accept a `horizontalOffset` prop and render each line of response content (status line, headers, separator, body lines) sliced from `horizontalOffset` display cells onward, truncated to the available content width in display cells. Slicing SHALL snap to grapheme-cluster boundaries so no character is split by the offset (display-cell semantics are specified in the **display-width** spec).

#### Scenario: ResponseView with zero offset
- **WHEN** `horizontalOffset` is `0`
- **THEN** the component SHALL render identically to current behavior (no visible change)

#### Scenario: ResponseView with positive offset
- **WHEN** `horizontalOffset` is greater than `0`
- **THEN** each line of response content SHALL be shifted left by `horizontalOffset` display cells, with the visible portion truncated to the content width in cells

#### Scenario: Offset does not split a wide character
- **WHEN** `horizontalOffset` lands between the two cells of a wide character in a response line
- **THEN** the slice SHALL start at the next grapheme-cluster boundary, keeping the wide character whole

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

#### Scenario: Default width when none provided
- **WHEN** `JUMP_HORIZONTAL { direction: 'end' }` is dispatched without a `columns` field
- **THEN** the bound SHALL be computed as if the terminal were 80 columns wide in the current layout (split or fullscreen)

#### Scenario: Jump to horizontal end clamped to zero when content fits
- **WHEN** `focusedPanel` is `requests` and every displayed request line fits within the request panel's content width at its current layout, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
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
In addition to existing Escape behaviors (close help overlay, cancel file load, cancel search, clear search results), the system SHALL handle Escape to cancel an in-flight request and to exit fullscreen mode. When the application is in normal mode and a request is in flight, pressing `Escape` SHALL cancel the in-flight request (see the **request-cancel** spec). When the application is in normal mode, no request is in flight, and `maximizedPanel` is not `null`, pressing `Escape` SHALL dispatch `TOGGLE_FULLSCREEN` — except while the response panel is maximized and search state is active, where `Escape` SHALL clear the search state first and leave the panel maximized (see the **response-search** and **fullscreen-panel** specs).

The full Escape priority chain in `useInput` SHALL be:
1. Help overlay open → dispatch `CLOSE_HELP`
2. File load mode → dispatch `CANCEL_FILE_LOAD`
3. Search mode → dispatch `CANCEL_SEARCH`
4. Normal mode with a request in flight → cancel the in-flight request
5. Normal mode with the response panel maximized and active search state → dispatch `CANCEL_SEARCH` (the panel remains maximized)
6. Normal mode with `maximizedPanel` not `null` → dispatch `TOGGLE_FULLSCREEN`
7. Normal mode with active search results → dispatch `CANCEL_SEARCH`

#### Scenario: Escape exits fullscreen in normal mode
- **WHEN** `maximizedPanel` is `'response'`, no request is in flight, no search state is active, and the user presses `Escape` in normal mode with no overlays
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched and fullscreen SHALL be exited

#### Scenario: Escape while loading cancels the request instead of exiting fullscreen
- **WHEN** `maximizedPanel` is `'response'`, a request is in flight, and the user presses `Escape` in normal mode
- **THEN** the in-flight request SHALL be canceled and fullscreen SHALL remain active

#### Scenario: Escape clears search before exiting a maximized response panel
- **WHEN** `maximizedPanel` is `'response'`, no request is in flight, and search results are active, and the user presses `Escape` in normal mode
- **THEN** the search state SHALL be cleared and the response panel SHALL remain maximized
- **AND** a subsequent `Escape` SHALL dispatch `TOGGLE_FULLSCREEN`

#### Scenario: Escape exits a maximized requests panel before clearing search results
- **WHEN** `maximizedPanel` is `'requests'`, no request is in flight, and search results are active, and the user presses `Escape` in normal mode
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched and the search results SHALL remain active until cleared after exiting fullscreen

### Requirement: Edge-jump navigation works across panel focus changes
Edge-jump shortcuts SHALL always target the currently focused panel. After switching panels via Tab, subsequent edge-jump presses SHALL act on the newly focused panel.

#### Scenario: Edge jump after Tab to details
- **WHEN** the user has Tab'd from `requests` to `details`, then presses `G`
- **THEN** the dispatched `JUMP_VERTICAL { direction: 'end', maxOffset }` SHALL affect `detailsScrollOffset` (not `requestScrollOffset`, not `responseScrollOffset`)

#### Scenario: Edge jump after Tab to response
- **WHEN** the user has Tab'd to `response`, then presses `$`
- **THEN** the dispatched `JUMP_HORIZONTAL { direction: 'end', columns }` SHALL affect `responseHorizontalOffset`
