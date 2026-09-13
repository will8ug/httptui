## MODIFIED Requirements

### Requirement: Enter search mode with `/` key
The system SHALL enter search mode when the user presses `/` in normal mode. Search mode SHALL only be enterable when the response panel has a response (i.e., `state.response` is not null). While a panel other than the response panel is maximized, `/` SHALL be a no-op (see the **fullscreen-panel** spec). Upon entering search mode, the focused panel SHALL be set to `response` and the search query SHALL be initialized to an empty string.

#### Scenario: Pressing `/` with a response loaded
- **WHEN** the app is in normal mode and a response exists
- **THEN** the app mode SHALL change to `'search'`
- **AND** the focused panel SHALL be `'response'`
- **AND** the search query SHALL be `''`

#### Scenario: Pressing `/` with no response
- **WHEN** the app is in normal mode and no response exists
- **THEN** the app mode SHALL remain `'normal'`

#### Scenario: Pressing `/` during fileLoad mode
- **WHEN** the app is in `'fileLoad'` mode
- **THEN** the `/` character SHALL be treated as text input for the file path, not as a search trigger

### Requirement: Navigate to next match with `n`
In normal mode, pressing `n` SHALL advance `currentMatchIndex` by 1 and scroll the response panel to the corresponding match line. If `currentMatchIndex` is at the last match, it SHALL wrap around to 0 (first match). While a panel other than the response panel is maximized, `n` SHALL be a no-op (see the **fullscreen-panel** spec).

#### Scenario: Next match within range
- **WHEN** `searchMatches` is `[2, 5, 12]` and `currentMatchIndex` is `0`
- **THEN** pressing `n` SHALL set `currentMatchIndex` to `1` and scroll to line 5

#### Scenario: Next match wraps around
- **WHEN** `searchMatches` is `[2, 5, 12]` and `currentMatchIndex` is `2`
- **THEN** pressing `n` SHALL set `currentMatchIndex` to `0` and scroll to line 2

#### Scenario: Next match with no matches
- **WHEN** `searchMatches` is `[]`
- **THEN** pressing `n` SHALL have no effect

### Requirement: Navigate to previous match with `N`
In normal mode, pressing `N` SHALL decrement `currentMatchIndex` by 1 and scroll the response panel to the corresponding match line. If `currentMatchIndex` is at the first match (0), it SHALL wrap around to the last match. While a panel other than the response panel is maximized, `N` SHALL be a no-op (see the **fullscreen-panel** spec).

#### Scenario: Previous match within range
- **WHEN** `searchMatches` is `[2, 5, 12]` and `currentMatchIndex` is `1`
- **THEN** pressing `N` SHALL set `currentMatchIndex` to `0` and scroll to line 2

#### Scenario: Previous match wraps around
- **WHEN** `searchMatches` is `[2, 5, 12]` and `currentMatchIndex` is `0`
- **THEN** pressing `N` SHALL set `currentMatchIndex` to `2` and scroll to line 12

### Requirement: Dismiss search results with the quit key
In normal mode, when search results are active (non-empty `searchMatches` or non-empty `lastSearchQuery`), pressing `q` SHALL clear all search state and remove the search bar and match indicators, and SHALL NOT exit the application. When no search results are active, `q` SHALL retain its quit behavior as specified by the **tui** and **unsaved-changes** specs — except while a panel is maximized, where `q` SHALL be a no-op that neither exits the application nor opens the unsaved-changes confirmation prompt (see the **fullscreen-panel** spec).

Dismissal SHALL be indistinguishable from dismissing with Escape: the same state is cleared and the same panel content results. Because the press is a dismissal and not a quit, it SHALL NOT be intercepted by the unsaved-changes confirmation prompt, and it SHALL NOT produce a status-bar message.

This requirement governs `q` only while search results are displayed in normal mode. While the user is still typing a query, `q` remains an ordinary query character, as specified by the search-input requirements in this spec.

Fullscreen and in-flight requests SHALL be unaffected by `q`. Where Escape gives exiting fullscreen priority over clearing search results (see the **fullscreen-panel** spec), `q` clears search results regardless of whether a panel is maximized, and leaves the maximized panel maximized. The quit fallback is the only part of `q`'s behavior that fullscreen restricts.

#### Scenario: The quit key dismisses active matches

- **WHEN** the app is in normal mode with active search matches
- **THEN** pressing `q` SHALL clear all search state (`searchQuery`, `searchMatches`, `currentMatchIndex`, `lastSearchQuery`)
- **AND** the search bar and match indicators SHALL no longer be displayed
- **AND** the application SHALL NOT exit

#### Scenario: The quit key dismisses a no-match search bar

- **WHEN** the app is in normal mode with `lastSearchQuery` set but `searchMatches` empty (no matches found)
- **THEN** pressing `q` SHALL clear all search state and the application SHALL NOT exit

#### Scenario: The quit key still quits once results are dismissed

- **WHEN** search results have just been dismissed by pressing `q`, no panel is maximized, and no unsaved changes exist
- **THEN** pressing `q` again SHALL exit the application

#### Scenario: The quit key quits when no search results are displayed

- **WHEN** the app is in normal mode, no panel is maximized, no active search state exists, and no unsaved changes exist
- **THEN** pressing `q` SHALL exit the application

#### Scenario: Dismissal leaves a maximized panel maximized

- **WHEN** a panel is maximized and search results are active, and the user presses `q`
- **THEN** the search state SHALL be cleared, the panel SHALL remain maximized, and the application SHALL NOT exit

#### Scenario: Dismissal reports nothing in the status bar

- **WHEN** search results are dismissed by pressing `q`
- **THEN** no transient message SHALL be displayed in the status bar

#### Scenario: The search bar hint continues to name Escape

- **WHEN** search results are displayed
- **THEN** the search bar hint SHALL read `(Esc to dismiss)` unchanged, and the status bar SHALL continue to advertise `q` as the quit shortcut
