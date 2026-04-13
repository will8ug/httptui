## MODIFIED Requirements

### Requirement: Key input handling
The `useInput` hook in `App` SHALL handle `←`/`h` and `→`/`l` keys in normal mode, dispatching `SCROLL_HORIZONTAL` actions with the appropriate direction (`'left'` or `'right'`) based on which key was pressed.

#### Scenario: Press left arrow or h key
- **WHEN** the user presses `←` or `h` in normal mode (not in file-load or help overlay)
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'left' }`

#### Scenario: Press right arrow or l key
- **WHEN** the user presses `→` or `l` in normal mode (not in file-load or help overlay)
- **THEN** the system SHALL dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'right' }`

### Requirement: Horizontal offset in AppState
The `AppState` interface SHALL include `requestHorizontalOffset: number` and `responseHorizontalOffset: number` fields, both initialized to `0`.

#### Scenario: Initial state
- **WHEN** the application creates the initial state
- **THEN** `requestHorizontalOffset` SHALL be `0` and `responseHorizontalOffset` SHALL be `0`

### Requirement: Horizontal offset reset in reducer
The reducer SHALL reset `requestHorizontalOffset` to `0` on `SELECT_REQUEST` and `MOVE_SELECTION` actions. The reducer SHALL reset `responseHorizontalOffset` to `0` on `SEND_REQUEST` action.

#### Scenario: Move selection resets request horizontal offset
- **WHEN** a `MOVE_SELECTION` or `SELECT_REQUEST` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL be set to `0`

#### Scenario: Send request resets response horizontal offset
- **WHEN** a `SEND_REQUEST` action is dispatched
- **THEN** `responseHorizontalOffset` SHALL be set to `0`

### Requirement: RequestList receives horizontalOffset prop
The `RequestList` component SHALL accept a `horizontalOffset` prop (number) and render request entries shifted by that offset.

#### Scenario: Layout passes horizontalOffset to RequestList
- **WHEN** the App renders the RequestList
- **THEN** it SHALL pass `horizontalOffset={state.requestHorizontalOffset}` as a prop

### Requirement: ResponseView receives horizontalOffset prop
The `ResponseView` component SHALL accept a `horizontalOffset` prop (number) and render response content shifted by that offset.

#### Scenario: Layout passes horizontalOffset to ResponseView
- **WHEN** the App renders the ResponseView
- **THEN** it SHALL pass `horizontalOffset={state.responseHorizontalOffset}` as a prop

## ADDED Requirements

### Requirement: Keyboard shortcuts table updated
The keyboard shortcuts reference in the TUI spec SHALL include `←/h` and `→/l` entries for horizontal scrolling in the currently focused panel.

#### Scenario: Left key scrolls focused panel left
- **WHEN** the user presses `←` or `h`
- **THEN** the focused panel's horizontal offset SHALL decrease by 2 (clamped to 0)

#### Scenario: Right key scrolls focused panel right
- **WHEN** the user presses `→` or `l`
- **THEN** the focused panel's horizontal offset SHALL increase by 2

#### Scenario: Horizontal keys ignored in overlay modes
- **WHEN** the help overlay or file-load overlay is active
- **THEN** pressing `←`/`h`/`→`/`l` SHALL NOT dispatch a `SCROLL_HORIZONTAL` action