## ADDED Requirements

### Requirement: Integration test directory
Integration tests SHALL live under `test/integration/`. Each file SHALL have `.test.tsx` extension and SHALL render the real `<App>` component via `ink-testing-library`. The existing file `test/edge-jump-integration.test.tsx` SHALL be moved to `test/integration/edge-jump.test.tsx` as part of this change.

#### Scenario: Vitest discovers integration tests
- **WHEN** `npm test` is run
- **THEN** files matching `test/integration/**/*.test.tsx` SHALL be discovered and executed by Vitest without additional config changes

#### Scenario: Integration tests render real App
- **WHEN** an integration test file is examined
- **THEN** it SHALL import `{ App }` from `../../src/app` and render it via `ink-testing-library`'s `render()` function

### Requirement: Toggle keybinding integration tests
The system SHALL include integration tests for toggle keybindings (`v`, `w`, `r`, `d`, `?`) at `test/integration/toggles.test.tsx`. Each test SHALL render `<App>`, send the key via `stdin.write`, and assert the rendered frame reflects the expected state change.

#### Scenario: Verbose toggle visible in rendered output
- **WHEN** the user presses `v` in normal mode
- **THEN** subsequent rendered frames SHALL reflect verbose mode (e.g., response headers visible when a response is present, or a visible state indicator in the status bar)

#### Scenario: Wrap toggle visible in rendered output
- **WHEN** the user presses `w` in normal mode
- **THEN** subsequent rendered frames SHALL reflect the wrap mode change (content rewrapping, or a visible wrap-mode indicator)

#### Scenario: Raw toggle visible in rendered output
- **WHEN** the user presses `r` in normal mode with a JSON response loaded
- **THEN** subsequent rendered frames SHALL reflect the raw-mode change (JSON formatting toggled)

#### Scenario: Details panel toggle visible in rendered output
- **WHEN** the user presses `d` in normal mode
- **THEN** subsequent rendered frames SHALL show or hide the details panel accordingly

#### Scenario: Help overlay opens on `?` and closes on `Esc` or `?`
- **WHEN** the user presses `?` in normal mode
- **THEN** the rendered frame SHALL include help overlay content (keybinding descriptions)
- **WHEN** the user then presses `Esc` or `?` again
- **THEN** the rendered frame SHALL no longer include the help overlay

### Requirement: File-load overlay integration tests
The system SHALL include integration tests for the file-load overlay (`o`, text input, `Enter`, `Esc`) at `test/integration/file-load.test.tsx`.

#### Scenario: File-load overlay opens on `o`
- **WHEN** the user presses `o` in normal mode
- **THEN** the rendered frame SHALL display the file-load overlay with an input field

#### Scenario: Text input accumulates in overlay
- **WHEN** the file-load overlay is open and the user types characters
- **THEN** the rendered frame SHALL show the accumulated input text

#### Scenario: Invalid file path shows error
- **WHEN** the file-load overlay is open, the user enters a path that does not exist, and presses `Enter`
- **THEN** the rendered frame SHALL show an error message

#### Scenario: Escape cancels file-load overlay
- **WHEN** the file-load overlay is open and the user presses `Esc`
- **THEN** the rendered frame SHALL return to normal mode without loading

### Requirement: Reload keybinding integration tests
The system SHALL include integration tests for the `R` reload keybinding at `test/integration/reload.test.tsx`. Tests MAY use a temporary `.http` file on disk to exercise the real file-read path.

#### Scenario: Pressing `R` reloads file
- **WHEN** the user presses `R` with a valid file path configured
- **THEN** the rendered frame SHALL briefly display a "Reloaded" message in the status bar

### Requirement: Search integration tests
The system SHALL include integration tests for search keybindings (`/`, text input, `Enter`, `Esc`, `n`, `N`) at `test/integration/search.test.tsx`.

#### Scenario: Search mode activates on `/`
- **WHEN** a response is loaded and the user presses `/`
- **THEN** the rendered frame SHALL display a search input bar

#### Scenario: Search with matches highlights current match
- **WHEN** the user enters a query matching response body lines and presses `Enter`
- **THEN** the rendered frame SHALL display the match count (e.g., `[1/N]`) and a current-match indicator

#### Scenario: `n` advances to next match
- **WHEN** search matches are active and the user presses `n`
- **THEN** the rendered frame SHALL update the current match indicator to the next match

#### Scenario: `Esc` dismisses search state
- **WHEN** search matches are active and the user presses `Esc`
- **THEN** the rendered frame SHALL no longer display match indicators or the search bar

### Requirement: Navigation keybinding integration tests
The system SHALL include integration tests for core navigation keybindings (`j`, `k`, arrows, `Tab`) at `test/integration/navigation.test.tsx`.

#### Scenario: `j` and `k` move selection in requests panel
- **WHEN** the requests panel is focused and the user presses `j` (or the down arrow)
- **THEN** the rendered frame SHALL show the next request selected

#### Scenario: `Tab` cycles focus between panels
- **WHEN** the requests panel is focused and the user presses `Tab`
- **THEN** the rendered frame SHALL show focus moved to the next panel (response or details based on visibility)