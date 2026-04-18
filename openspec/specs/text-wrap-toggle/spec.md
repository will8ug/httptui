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
When `wrapMode` is `'wrap'`, the response panel SHALL wrap long lines at the panel boundary instead of truncating them. Lines that exceed `contentWidth` SHALL continue on the next visual line, broken at word boundaries when possible, or at character boundaries for strings longer than `contentWidth` with no spaces.

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