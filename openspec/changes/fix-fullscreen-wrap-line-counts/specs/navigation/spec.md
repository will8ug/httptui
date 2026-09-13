## MODIFIED Requirements

### Requirement: JUMP_VERTICAL action
The system SHALL define a `JUMP_VERTICAL` action type in the `Action` union with `direction: 'start' | 'end'` and an optional `maxOffset: number` field. The reducer SHALL apply the action based on the currently focused panel:

- When `focusedPanel === 'requests'` and `direction === 'start'`: set `selectedIndex` to `0`, adjust `requestScrollOffset` so index `0` is visible, and reset `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` to `0`.
- When `focusedPanel === 'requests'` and `direction === 'end'`: set `selectedIndex` to the last request's index (`0` when the list is empty), adjust `requestScrollOffset` so the selected request is visible, and reset `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` to `0`.
- When `focusedPanel === 'details'` and `direction === 'start'`: set `detailsScrollOffset` to `0`.
- When `focusedPanel === 'details'` and `direction === 'end'`: set `detailsScrollOffset` to the provided `maxOffset` value (lower-bounded at `0`); when `maxOffset` is not provided, `detailsScrollOffset` SHALL be left unchanged.
- When `focusedPanel === 'response'` and `direction === 'start'`: set `responseScrollOffset` to `0`.
- When `focusedPanel === 'response'` and `direction === 'end'`: set `responseScrollOffset` to the provided `maxOffset` value (lower-bounded at `0`); when `maxOffset` is not provided, `responseScrollOffset` SHALL be left unchanged.

The `maxOffset` dispatched for `direction: 'end'` SHALL be computed from the panel's rendered layout — in wrap mode the visual-line total depends on the panel's content width, which differs between the split view and a maximized panel (see the **Keyboard bindings for edge-jump navigation** requirement).

No other state fields SHALL be modified by `JUMP_VERTICAL`.

#### Scenario: Jump to top of requests panel
- **WHEN** `focusedPanel` is `requests`, `selectedIndex` is greater than `0`, and a `JUMP_VERTICAL { direction: 'start' }` action is dispatched
- **THEN** `selectedIndex` SHALL become `0`
- **AND** `requestScrollOffset` SHALL be adjusted so index `0` is visible
- **AND** `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` SHALL be `0`

#### Scenario: Jump to bottom of requests panel
- **WHEN** `focusedPanel` is `requests`, `requests.length` is `N` (with `N > 0`), and a `JUMP_VERTICAL { direction: 'end' }` action is dispatched
- **THEN** `selectedIndex` SHALL become `N - 1`
- **AND** `requestScrollOffset` SHALL be adjusted so the last request is visible
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

#### Scenario: Jump to bottom in a maximized response panel in wrap mode
- **WHEN** the response panel is maximized, `wrapMode` is `'wrap'`, body lines wrap into fewer visual lines at the fullscreen width than at the split width, and a `JUMP_VERTICAL { direction: 'end', maxOffset }` action is dispatched with `maxOffset` computed for the maximized layout
- **THEN** `responseScrollOffset` SHALL land at the last visual line of the content as rendered at the fullscreen width, with no blank space below the content

### Requirement: Keyboard bindings for edge-jump navigation
The system SHALL bind the following keys in `useInput` (when no overlay is open and the application is in normal mode):

- `g` SHALL dispatch `{ type: 'JUMP_VERTICAL', direction: 'start' }`.
- `G` (Shift+g) SHALL dispatch `{ type: 'JUMP_VERTICAL', direction: 'end', maxOffset }` where `maxOffset` is computed by the component layer from the focused panel's rendered layout (split or fullscreen) and its visible height; when `focusedPanel === 'requests'`, `maxOffset` MAY be omitted (the reducer derives the bound from `requests.length`).
- `0` SHALL dispatch `{ type: 'JUMP_HORIZONTAL', direction: 'start', columns }` where `columns` is the current terminal width.
- `$` SHALL dispatch `{ type: 'JUMP_HORIZONTAL', direction: 'end', columns }` where `columns` is the current terminal width.
- `Tab` SHALL dispatch `{ type: 'SWITCH_PANEL' }` only when `maximizedPanel` is `null`. When `maximizedPanel` is not `null`, `Tab` SHALL be a no-op.

The handlers SHALL NOT fire when the help overlay is open or when the application is in `'fileLoad'` mode.

#### Scenario: Pressing g in normal mode
- **WHEN** the application is in normal mode, no overlay is open, and the user presses `g`
- **THEN** a `JUMP_VERTICAL { direction: 'start' }` action SHALL be dispatched

#### Scenario: Pressing G in normal mode
- **WHEN** the application is in normal mode, no overlay is open, and the user presses `G` (Shift+g)
- **THEN** a `JUMP_VERTICAL { direction: 'end', maxOffset }` action SHALL be dispatched with `maxOffset` computed from the focused panel's rendered layout (split or fullscreen) and its visible height

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
