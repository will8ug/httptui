# Spec: Text Wrap Toggle

## Purpose

Toggle between nowrap (truncate + horizontal scroll) and wrap (word-wrap at panel boundary) display modes in the response panel, controlled by the `w` key.

## Requirements

### Requirement: Wrap mode state
The system SHALL maintain a `wrapMode` field on `AppState` with type `'nowrap' | 'wrap'`, defaulting to `'nowrap'`. This controls whether the response panel wraps long lines at the panel boundary or truncates them with horizontal scrolling.

#### Scenario: Initial state defaults to nowrap
- **WHEN** the application starts
- **THEN** `state.wrapMode` SHALL be `'nowrap'`

#### Scenario: Toggle switches between modes
- **WHEN** a `TOGGLE_WRAP` action is dispatched
- **THEN** `state.wrapMode` SHALL switch from `'nowrap'` to `'wrap'` or from `'wrap'` to `'nowrap'`

#### Scenario: Toggle resets scroll offsets
- **WHEN** a `TOGGLE_WRAP` action is dispatched
- **THEN** `state.responseScrollOffset` SHALL be reset to `0`
- **AND** `state.responseHorizontalOffset` SHALL be reset to `0`

### Requirement: Wrap mode keyboard shortcut
The system SHALL respond to the `w` key by dispatching a `TOGGLE_WRAP` action. This shortcut SHALL work in normal mode (not during file-load mode or when the help overlay is open).

#### Scenario: Pressing w toggles wrap mode
- **WHEN** the user presses `w` while in normal mode (no overlay open, not in file-load mode)
- **THEN** the system SHALL dispatch `{ type: 'TOGGLE_WRAP' }`

#### Scenario: w key ignored in file-load mode
- **WHEN** the user presses `w` while in file-load mode
- **THEN** the key SHALL be routed to the file-load input handler and SHALL NOT toggle wrap mode

#### Scenario: w key ignored while help overlay is open
- **WHEN** the user presses `w` while the help overlay is visible
- **THEN** the key SHALL be ignored (help overlay captures all input)

### Requirement: Wrap mode action type
The system SHALL define a `TOGGLE_WRAP` action type in the `Action` discriminated union at `src/core/types.ts` with shape `{ type: 'TOGGLE_WRAP' }`.

#### Scenario: Action type exists in union
- **WHEN** the `Action` type is inspected
- **THEN** it SHALL include `{ type: 'TOGGLE_WRAP' }` as a member

### Requirement: Wrap mode rendering in response panel
When `wrapMode` is `'wrap'`, the response panel SHALL wrap long lines at the panel boundary instead of truncating them. Lines whose display-cell width exceeds `contentWidth` SHALL continue on the next visual line, broken at word boundaries when possible, or at grapheme-cluster boundaries for strings longer than `contentWidth` with no spaces (display-cell measurement and grapheme-safe boundaries are specified in the **display-width** spec). The status line SHALL preserve its structured color segments (gray `HTTP/1.1 ` prefix, status-code color on the code and status text, gray duration suffix) across wrap boundaries — the first wrapped visual line SHALL retain the gray `HTTP/1.1 ` prefix color when the segment falls on it, matching the non-wrapped rendering.

#### Scenario: Long line wraps in wrap mode
- **WHEN** `wrapMode` is `'wrap'` and a response line's display-cell width exceeds `contentWidth`
- **THEN** the line SHALL be split into multiple visual lines at `contentWidth` display-cell boundaries, preferring word boundaries
- **AND** each visual line SHALL occupy at most `contentWidth` display cells
- **AND** the visual lines SHALL be included in the scrollable content array for vertical scrolling

#### Scenario: Multilingual line wraps within the panel budget
- **WHEN** `wrapMode` is `'wrap'` and a response line composed of CJK or other wide characters exceeds `contentWidth` cells
- **THEN** the wrapped visual lines SHALL each stay within `contentWidth` display cells
- **AND** no wide character or grapheme cluster SHALL be split across two visual lines

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

### Requirement: Horizontal scroll disabled in wrap mode
When `wrapMode` is `'wrap'`, `←`/`→`/`h`/`l` keys SHALL NOT scroll the response panel horizontally. The `responseHorizontalOffset` SHALL be treated as `0` in wrap mode.

#### Scenario: Horizontal scroll keys ignored in wrap mode for response panel
- **WHEN** `wrapMode` is `'wrap'` and the response panel is focused
- **AND** the user presses `←`, `→`, `h`, or `l`
- **THEN** the response panel SHALL NOT change its horizontal offset

#### Scenario: Horizontal scroll works normally in nowrap mode
- **WHEN** `wrapMode` is `'nowrap'` and the response panel is focused
- **AND** the user presses `←`, `→`, `h`, or `l`
- **THEN** the response panel SHALL scroll horizontally as before

### Requirement: Wrap mode indicator
When `wrapMode` is `'wrap'`, the response panel border or title SHALL indicate that wrap mode is active, so users can distinguish the current mode at a glance.

#### Scenario: Wrap indicator in response panel title
- **WHEN** `wrapMode` is `'wrap'`
- **THEN** the response panel title SHALL display `Response [wrap]` or equivalent indicator

#### Scenario: No indicator in nowrap mode
- **WHEN** `wrapMode` is `'nowrap'`
- **THEN** the response panel title SHALL display `Response` with no wrap indicator