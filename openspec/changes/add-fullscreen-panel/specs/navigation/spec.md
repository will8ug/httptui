# Spec: Navigation (Delta)

## MODIFIED Requirements

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
- **WHEN** `maximizedPanel` is `'response'` and the application is in normal mode with no overlays, and the user presses `Escape`
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched and fullscreen SHALL be exited