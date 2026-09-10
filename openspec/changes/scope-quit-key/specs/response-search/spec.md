## ADDED Requirements

### Requirement: Dismiss search results with the quit key

In normal mode, when search results are active (non-empty `searchMatches` or non-empty `lastSearchQuery`), pressing `q` SHALL clear all search state and remove the search bar and match indicators, and SHALL NOT exit the application. When no search results are active, `q` SHALL retain its quit behavior as specified by the **tui** and **unsaved-changes** specs.

Dismissal SHALL be indistinguishable from dismissing with Escape: the same state is cleared and the same panel content results. Because the press is a dismissal and not a quit, it SHALL NOT be intercepted by the unsaved-changes confirmation prompt, and it SHALL NOT produce a status-bar message.

This requirement governs `q` only while search results are displayed in normal mode. While the user is still typing a query, `q` remains an ordinary query character, as specified by the search-input requirements in this spec.

Fullscreen and in-flight requests SHALL be unaffected by `q`. Where Escape gives exiting fullscreen priority over clearing search results (see the **fullscreen-panel** spec), `q` clears search results regardless of whether a panel is maximized, and leaves the maximized panel maximized.

#### Scenario: The quit key dismisses active matches

- **WHEN** the app is in normal mode with active search matches
- **THEN** pressing `q` SHALL clear all search state (`searchQuery`, `searchMatches`, `currentMatchIndex`, `lastSearchQuery`)
- **AND** the search bar and match indicators SHALL no longer be displayed
- **AND** the application SHALL NOT exit

#### Scenario: The quit key dismisses a no-match search bar

- **WHEN** the app is in normal mode with `lastSearchQuery` set but `searchMatches` empty (no matches found)
- **THEN** pressing `q` SHALL clear all search state and the application SHALL NOT exit

#### Scenario: The quit key still quits once results are dismissed

- **WHEN** search results have just been dismissed by pressing `q` and no unsaved changes exist
- **THEN** pressing `q` again SHALL exit the application

#### Scenario: The quit key quits when no search results are displayed

- **WHEN** the app is in normal mode with no active search state and no unsaved changes
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
