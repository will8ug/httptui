## ADDED Requirements

### Requirement: Fullscreen key whitelist
While a panel is maximized, normal-mode key handling SHALL honor only the keys listed below; every other normal-mode key binding SHALL be a silent no-op (no action dispatched, no overlay opened, no mode change, no status-bar message). This restriction takes precedence over keybinding requirements in other capability specs while a panel is maximized.

Permitted regardless of which panel is maximized:
- Navigation keys (`j`/`k`/arrow keys, `h`/`l`, `g`, `G`, `0`, `$`) acting on the maximized panel, as specified by the **navigation** spec
- `f` to toggle fullscreen off, and `Escape` with its existing priority (cancel an in-flight request first, otherwise exit fullscreen), as specified by the **navigation** spec
- `?` to open the help overlay over fullscreen
- `Ctrl+C` to exit the application, preserving the terminal convention that the interrupt key always terminates
- `q` to dismiss displayed search results, as specified by the **response-search** spec (the quit fallback is restricted — see the requirement below)

Permitted only while the response panel is maximized:
- The display toggles `v`, `r`, `w` — their effects (verbose headers, raw formatting, wrapping) render only in the response panel
- The search keys `/`, `n`, `N`

#### Scenario: Ctrl+C exits from fullscreen
- **WHEN** a panel is maximized and the user presses `Ctrl+C`
- **THEN** the application SHALL exit cleanly and restore the terminal

#### Scenario: Navigation keys act on the maximized panel
- **WHEN** the requests panel is maximized and the user presses `j` or `k`
- **THEN** the request selection SHALL move within the fullscreen request list
- **WHEN** the response panel is maximized and the user presses `G`
- **THEN** the response panel SHALL jump to its bottom

#### Scenario: Display toggles work while the response panel is maximized
- **WHEN** the response panel is maximized and the user presses `w`
- **THEN** the response panel SHALL toggle wrap mode and its title SHALL reflect the new mode

#### Scenario: Display toggles are no-ops outside response fullscreen
- **WHEN** the requests panel is maximized and the user presses `v`, `r`, or `w`
- **THEN** the display modes SHALL remain unchanged: after exiting fullscreen, the response panel SHALL render with the same verbose, raw, and wrap settings as before
- **WHEN** the details panel is maximized and the user presses `w`
- **THEN** the wrap setting SHALL remain unchanged after exiting fullscreen

#### Scenario: Search keys are no-ops outside response fullscreen
- **WHEN** the requests or details panel is maximized and the user presses `/`
- **THEN** the application SHALL remain in normal mode and no search bar SHALL appear
- **WHEN** the requests or details panel is maximized, search results are active, and the user presses `n` or `N`
- **THEN** the current match index SHALL remain unchanged

### Requirement: Action keys are no-ops in fullscreen
While any panel is maximized, the following keys SHALL be no-ops: `Enter` (send request), `s` (save response), `S` (save as .http), `p` (paste as curl), `y` (copy as curl), `o` (open file), `E` (switch environment), `e` (edit request), `R` (reload file), `Ctrl+S` (in-place save), and `Ctrl+G` (external editor handoff). They SHALL NOT perform their action, open an overlay, or trigger the unsaved-changes confirmation prompt while a panel is maximized. Their behavior outside fullscreen SHALL be unchanged.

#### Scenario: Enter does not send from a maximized response panel
- **WHEN** the response panel is maximized and the user presses `Enter`
- **THEN** no request SHALL be sent, no loading indicator SHALL appear, and the fullscreen view SHALL persist

#### Scenario: Enter does not send from a maximized request list
- **WHEN** the requests panel is maximized and the user presses `Enter`
- **THEN** no request SHALL be sent and the fullscreen view SHALL persist

#### Scenario: File load cannot be opened from fullscreen
- **WHEN** any panel is maximized and the user presses `o`
- **THEN** no file-load overlay SHALL appear and the fullscreen view SHALL persist

#### Scenario: External editor handoff cannot be triggered from fullscreen
- **WHEN** any panel is maximized and the user presses `Ctrl+G`
- **THEN** the terminal SHALL NOT be suspended, no external editor SHALL launch, and the fullscreen view SHALL persist

#### Scenario: Other action keys do nothing in fullscreen
- **WHEN** any panel is maximized and the user presses `s`, `S`, `p`, `y`, `E`, `e`, `R`, or `Ctrl+S`
- **THEN** no overlay or confirmation prompt SHALL appear, no file or clipboard operation SHALL occur, and the fullscreen view SHALL persist

### Requirement: The quit key does not quit from fullscreen
While any panel is maximized, pressing `q` SHALL NOT exit the application and SHALL NOT open the unsaved-changes confirmation prompt. When search results are displayed, `q` SHALL still dismiss them and leave the panel maximized, as specified by the **response-search** spec. Quitting from fullscreen requires `Ctrl+C`, or exiting fullscreen first via `Escape` or `f`.

#### Scenario: q without search results does not quit from fullscreen
- **WHEN** a panel is maximized, no search results are displayed, and the user presses `q`
- **THEN** the application SHALL NOT exit and the fullscreen view SHALL persist

#### Scenario: q with unsaved changes opens no prompt from fullscreen
- **WHEN** a panel is maximized, unsaved edits exist, no search results are displayed, and the user presses `q`
- **THEN** no confirmation prompt SHALL appear and the fullscreen view SHALL persist

#### Scenario: q quits after exiting fullscreen
- **WHEN** a panel is maximized, no search results are displayed, and the user presses `f` followed by `q`
- **THEN** the application SHALL exit

## REMOVED Requirements

### Requirement: Toggle details on fullscreen details panel is no-op
**Reason**: The no-op was scoped to the details panel only; pressing `d` while the requests or response panel was maximized silently toggled the hidden details panel's visibility — an invisible state change that violates the fullscreen inspection principle.
**Migration**: Superseded by "Toggle details is no-op in fullscreen", which makes `d` a no-op in every fullscreen state. The details panel visibility can be toggled outside fullscreen as usual.

## ADDED Requirements

### Requirement: Toggle details is no-op in fullscreen
When any panel is maximized (`requests`, `details`, or `response`), pressing `d` SHALL be a no-op — `TOGGLE_REQUEST_DETAILS` SHALL NOT be dispatched and the details-panel visibility state SHALL remain unchanged. When no panel is maximized, pressing `d` SHALL dispatch `TOGGLE_REQUEST_DETAILS` as usual.

#### Scenario: Pressing d in fullscreen never changes the details state
- **WHEN** the requests panel is maximized, the details panel is hidden, and the user presses `d`
- **THEN** the details panel SHALL remain hidden after exiting fullscreen
- **WHEN** the details panel is maximized and the user presses `d`
- **THEN** the details panel SHALL remain maximized and visible

#### Scenario: Pressing d outside fullscreen toggles details normally
- **WHEN** no panel is maximized and the details panel is hidden
- **THEN** pressing `d` SHALL show the details panel

## MODIFIED Requirements

### Requirement: Fullscreen state preserved across overlays and mode changes
When a panel is maximized and the user opens the help overlay (`?`) or enters search mode from a maximized response panel (`/`), the `maximizedPanel` state SHALL be preserved. When the overlay is dismissed or the mode returns to normal, the fullscreen view SHALL be restored. The file-load overlay can no longer be opened while a panel is maximized (`o` is restricted — see the action-keys requirement above); entering file load from normal mode and later maximizing a panel is unaffected.

#### Scenario: Help overlay over fullscreen
- **WHEN** a panel is maximized and the user presses `?`
- **THEN** the help overlay SHALL open and `maximizedPanel` SHALL be unchanged
- **AND** when the help overlay is closed, the fullscreen panel SHALL be rendered again

#### Scenario: File load overlay over fullscreen
- **WHEN** a panel is maximized and the user presses `o`
- **THEN** no file-load overlay SHALL appear and the fullscreen panel SHALL remain rendered

#### Scenario: Search mode in fullscreen
- **WHEN** the response panel is maximized and the user presses `/`
- **THEN** the mode SHALL become `'search'` and `maximizedPanel` SHALL remain `'response'`
- **AND** search SHALL operate on the response content within the fullscreen panel
- **WHEN** the requests or details panel is maximized and the user presses `/`
- **THEN** the mode SHALL remain `'normal'` and the fullscreen panel SHALL remain rendered
