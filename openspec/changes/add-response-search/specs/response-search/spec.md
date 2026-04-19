## ADDED Requirements

### Requirement: Enter search mode with `/` key
The system SHALL enter search mode when the user presses `/` in normal mode. Search mode SHALL only be enterable when the response panel has a response (i.e., `state.response` is not null). Upon entering search mode, the focused panel SHALL be set to `response` and the search query SHALL be initialized to an empty string.

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

### Requirement: Text input capture in search mode
In search mode, the system SHALL capture printable character input and append it to the search query. Backspace SHALL remove the last character. The system SHALL NOT process normal-mode shortcuts (navigation, toggles, etc.) while in search mode.

#### Scenario: Typing characters in search mode
- **WHEN** the user types `abc` in search mode
- **THEN** the search query SHALL be `'abc'`

#### Scenario: Backspace in search mode
- **WHEN** the search query is `'abc'` and the user presses Backspace
- **THEN** the search query SHALL be `'ab'`

#### Scenario: Backspace on empty query
- **WHEN** the search query is `''` and the user presses Backspace
- **THEN** the search query SHALL remain `''`

### Requirement: Confirm search with Enter
When the user presses Enter in search mode, the system SHALL compute matches against the response body, store the match results, set the current match index to 0 (first match), scroll the response panel to the first match, and return to normal mode. The search query SHALL be preserved as `lastSearchQuery` for subsequent `n`/`N` navigation.

#### Scenario: Confirm search with matches found
- **WHEN** the user presses Enter with query `'john'` and the response body contains `'john'` on lines 2, 5, and 12
- **THEN** `searchMatches` SHALL be `[2, 5, 12]`
- **AND** `currentMatchIndex` SHALL be `0`
- **AND** `responseScrollOffset` SHALL position line 2 in view
- **AND** the app mode SHALL return to `'normal'`
- **AND** `lastSearchQuery` SHALL be `'john'`

#### Scenario: Confirm search with no matches
- **WHEN** the user presses Enter with query `'xyz'` and the response body does not contain `'xyz'`
- **THEN** `searchMatches` SHALL be `[]`
- **AND** the app mode SHALL return to `'normal'`
- **AND** `lastSearchQuery` SHALL be `'xyz'`

#### Scenario: Confirm search with empty query
- **WHEN** the user presses Enter with an empty query
- **THEN** all search state SHALL be cleared (matches, index, lastSearchQuery)
- **AND** the app mode SHALL return to `'normal'`

### Requirement: Cancel search with Escape
When the user presses Escape in search mode, the system SHALL return to normal mode and clear all search state (query, matches, current match index). The `lastSearchQuery` SHALL also be cleared.

#### Scenario: Cancel search
- **WHEN** the user presses Escape in search mode
- **THEN** the app mode SHALL return to `'normal'`
- **AND** `searchQuery`, `searchMatches`, `currentMatchIndex`, and `lastSearchQuery` SHALL all be reset

### Requirement: Case-insensitive matching
Match computation SHALL be case-insensitive. The query and each body line SHALL both be lowercased before comparison using `String.prototype.toLowerCase()`.

#### Scenario: Case-insensitive match
- **WHEN** the query is `'john'` and a body line contains `'John'`
- **THEN** that line SHALL be included in `searchMatches`

#### Scenario: Mixed case query
- **WHEN** the query is `'JoHn'` and a body line contains `'john'`
- **THEN** that line SHALL be included in `searchMatches`

### Requirement: Match computation against formatted body
Match computation SHALL run against the output of `formatResponseBody(response.body, rawMode)`, split by newlines. This ensures matches align with what the user sees in the response panel (respecting raw mode).

#### Scenario: Search in formatted mode
- **WHEN** raw mode is off and the response body is JSON
- **THEN** matches SHALL be computed against the pretty-printed (formatted) body text

#### Scenario: Search in raw mode
- **WHEN** raw mode is on
- **THEN** matches SHALL be computed against the raw (unformatted) body text

### Requirement: Navigate to next match with `n`
In normal mode, pressing `n` SHALL advance `currentMatchIndex` by 1 and scroll the response panel to the corresponding match line. If `currentMatchIndex` is at the last match, it SHALL wrap around to 0 (first match).

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
In normal mode, pressing `N` SHALL decrement `currentMatchIndex` by 1 and scroll the response panel to the corresponding match line. If `currentMatchIndex` is at the first match (0), it SHALL wrap around to the last match.

#### Scenario: Previous match within range
- **WHEN** `searchMatches` is `[2, 5, 12]` and `currentMatchIndex` is `1`
- **THEN** pressing `N` SHALL set `currentMatchIndex` to `0` and scroll to line 2

#### Scenario: Previous match wraps around
- **WHEN** `searchMatches` is `[2, 5, 12]` and `currentMatchIndex` is `0`
- **THEN** pressing `N` SHALL set `currentMatchIndex` to `2` and scroll to line 12

### Requirement: Scroll-to-match adjusts for header offset
When scrolling to a match, the `responseScrollOffset` SHALL be set to `bodyLineIndex + headerOffset`, where `headerOffset` accounts for the status line (1), verbose headers (number of header entries if verbose mode is on, 0 otherwise), and the separator line (1). The offset SHALL be clamped to the maximum scroll offset.

#### Scenario: Scroll to match without verbose headers
- **WHEN** verbose mode is off and a match is on body line 5
- **THEN** `responseScrollOffset` SHALL be set to `5 + 2` (status + separator) = `7`

#### Scenario: Scroll to match with verbose headers
- **WHEN** verbose mode is on with 4 response headers and a match is on body line 5
- **THEN** `responseScrollOffset` SHALL be set to `5 + 6` (status + 4 headers + separator) = `11`

### Requirement: Arrow indicator on matching lines
`ResponseView` SHALL render a `►` prefix on the line corresponding to `currentMatchIndex` in a bright color (cyanBright). Other matching lines visible in the viewport SHALL render a `·` prefix in a dim color (gray). Non-matching lines SHALL have no prefix change.

#### Scenario: Current match indicator
- **WHEN** the response panel renders and body line 5 is the current match
- **THEN** that line SHALL be prefixed with `►` in cyanBright color

#### Scenario: Other match indicator
- **WHEN** the response panel renders and body line 12 is a match but not the current match
- **THEN** that line SHALL be prefixed with `·` in gray color

#### Scenario: No matches active
- **WHEN** there are no search matches
- **THEN** no lines SHALL have match indicators

### Requirement: Inline search bar display
When in search mode, `ResponseView` SHALL display a search bar at the bottom of the panel showing `/` followed by the current query and a cursor indicator. When in normal mode with active matches (non-empty `searchMatches`), the search bar SHALL show the last query and the current match position as `[currentMatchIndex+1/totalMatches]`.

#### Scenario: Search bar during input
- **WHEN** the app is in search mode with query `'john'`
- **THEN** the search bar SHALL display `/john_` (with `_` as cursor)

#### Scenario: Search bar with active matches
- **WHEN** the app is in normal mode with `lastSearchQuery` = `'john'`, `currentMatchIndex` = `1`, and `searchMatches.length` = `3`
- **THEN** the search bar SHALL display `/john                    [2/3]`

#### Scenario: Search bar with no matches after search
- **WHEN** the app is in normal mode with `lastSearchQuery` = `'xyz'` and `searchMatches.length` = `0`
- **THEN** the search bar SHALL display `/xyz              [No matches]`

#### Scenario: No search bar when no search state
- **WHEN** `lastSearchQuery` is empty and the app is in normal mode
- **THEN** no search bar SHALL be displayed

### Requirement: Dismiss search results with Escape
In normal mode, when search results are active (non-empty `searchMatches` or non-empty `lastSearchQuery`), pressing Escape SHALL clear all search state and remove the search bar and match indicators. If no search results are active, Escape SHALL have no effect.

#### Scenario: Escape dismisses active matches
- **WHEN** the app is in normal mode with active search matches
- **THEN** pressing Escape SHALL clear all search state (`searchQuery`, `searchMatches`, `currentMatchIndex`, `lastSearchQuery`)
- **AND** the search bar and match indicators SHALL no longer be displayed

#### Scenario: Escape dismisses no-match search bar
- **WHEN** the app is in normal mode with `lastSearchQuery` set but `searchMatches` empty (no matches found)
- **THEN** pressing Escape SHALL clear all search state

#### Scenario: Escape with no search state is a no-op
- **WHEN** the app is in normal mode with no active search state
- **THEN** pressing Escape SHALL have no effect

### Requirement: Search state cleared on response change
All search state (`searchQuery`, `searchMatches`, `currentMatchIndex`, `lastSearchQuery`) SHALL be cleared when a new request is sent (`SEND_REQUEST`), a new response is received (`RECEIVE_RESPONSE`), a request error occurs (`REQUEST_ERROR`), a different request is selected (`SELECT_REQUEST`, `MOVE_SELECTION`), or raw mode is toggled (`TOGGLE_RAW`).

#### Scenario: New request clears search
- **WHEN** the user sends a new request while search matches are active
- **THEN** all search state SHALL be cleared

#### Scenario: Selecting different request clears search
- **WHEN** the user selects a different request while search matches are active
- **THEN** all search state SHALL be cleared

#### Scenario: Toggling raw mode clears search
- **WHEN** the user toggles raw mode while search matches are active
- **THEN** all search state SHALL be cleared
