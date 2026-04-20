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

### Requirement: Scroll-to-match adjusts for visual-line layout
When scrolling to a match, the system SHALL set `responseScrollOffset` to the **visual line index** at which the matching raw body line begins in the rendered response. The visual line index SHALL account for:
- the number of visual lines occupied by the status line (which MAY exceed 1 in `wrap` mode when the status text exceeds `contentWidth`),
- the number of visual lines occupied by each verbose header (which MAY exceed 1 per header in `wrap` mode when a header line exceeds `contentWidth`; counted only when `verbose` is on),
- the single separator visual line,
- and the cumulative visual-line expansion of preceding body lines (each raw body line MAY occupy more than 1 visual line in `wrap` mode).

The offset SHALL be clamped to the maximum scroll offset. Callers dispatching `CONFIRM_SEARCH`, `NEXT_MATCH`, and `PREV_MATCH` SHALL compute the target visual line index from the canonical response-layout ledger (`computeResponseLayout`) rather than from scalar arithmetic such as `1 + headerCount + 1`.

#### Scenario: Scroll to match without verbose headers in nowrap mode
- **WHEN** `wrapMode` is `'nowrap'`, `verbose` is off, and a match is on raw body line 5
- **THEN** `responseScrollOffset` SHALL be set to `5 + 2` (status + separator) = `7`

#### Scenario: Scroll to match with verbose headers in nowrap mode
- **WHEN** `wrapMode` is `'nowrap'`, `verbose` is on with 4 response headers, and a match is on raw body line 5
- **THEN** `responseScrollOffset` SHALL be set to `5 + 6` (status + 4 headers + separator) = `11`

#### Scenario: Scroll to match in wrap mode with a wrapped verbose header
- **WHEN** `wrapMode` is `'wrap'`, `verbose` is on, one header line occupies 2 visual lines because it exceeds `contentWidth`, 3 other header lines each occupy 1 visual line, and a match is on raw body line 5 (which itself does not wrap and no preceding body line wraps)
- **THEN** `responseScrollOffset` SHALL be set to the visual index equal to `1 (status) + 5 (headers, with the long one counted as 2) + 1 (separator) + 5 (body lines before the match, all unwrapped)` = `12`
- **AND** the scroll SHALL land on the visual line that actually displays the match, not on a preceding visual line

#### Scenario: Scroll to match in wrap mode with a wrapped status line
- **WHEN** `wrapMode` is `'wrap'`, the status text wraps to 2 visual lines, `verbose` is off, and a match is on raw body line 0
- **THEN** `responseScrollOffset` SHALL be set to `2 (wrapped status) + 1 (separator) + 0` = `3`
- **AND** the scroll SHALL land on the visual line that actually displays the match

#### Scenario: Scroll to match in wrap mode with preceding wrapped body lines
- **WHEN** `wrapMode` is `'wrap'`, `verbose` is off, the status line is not wrapped, raw body line 0 occupies 3 visual lines (it wraps), raw body line 1 occupies 1 visual line, and a match is on raw body line 2
- **THEN** `responseScrollOffset` SHALL be set to `1 (status) + 1 (separator) + 3 (body[0]) + 1 (body[1])` = `6`
- **AND** the scroll SHALL land on the visual line that actually displays the match

### Requirement: Arrow indicator on matching lines
`ResponseView` SHALL render a `►` prefix on the **visual line** at which the raw body line identified by `searchMatches[currentMatchIndex]` begins, in a bright color (cyanBright). Other matching raw body lines SHALL have a `·` prefix rendered at their first visual line in a dim color (gray). Non-matching visual lines SHALL have no prefix change. The visual line for each raw body line SHALL be determined by the canonical response-layout ledger (`computeResponseLayout`), so that markers land correctly in both `wrap` and `nowrap` modes regardless of wrapped status, wrapped verbose headers, or wrapped body lines.

#### Scenario: Current match indicator in nowrap mode
- **WHEN** the response panel renders with `wrapMode === 'nowrap'` and raw body line 5 is the current match
- **THEN** the visual line corresponding to raw body line 5 SHALL be prefixed with `►` in cyanBright color

#### Scenario: Other match indicator in nowrap mode
- **WHEN** the response panel renders with `wrapMode === 'nowrap'` and raw body line 12 is a match but not the current match
- **THEN** the visual line corresponding to raw body line 12 SHALL be prefixed with `·` in gray color

#### Scenario: Current match indicator in wrap mode with wrapped headers
- **WHEN** `wrapMode === 'wrap'`, `verbose` is on, one header wraps to 2 visual lines, and raw body line 3 is the current match
- **THEN** the `►` prefix SHALL decorate the visual line that actually displays the start of raw body line 3, not a visual line offset by the flattened `1 + headerCount + 1` arithmetic

#### Scenario: Current match indicator in wrap mode with wrapped preceding body lines
- **WHEN** `wrapMode === 'wrap'`, raw body line 0 wraps to 3 visual lines, raw body line 1 is the current match
- **THEN** the `►` prefix SHALL decorate the first visual line of raw body line 1, which is 3 visual lines below the start of raw body line 0

#### Scenario: No matches active
- **WHEN** there are no search matches
- **THEN** no visual lines SHALL have match indicators

### Requirement: Inline search bar display
When in search mode, `ResponseView` SHALL display a search bar pinned to the bottom edge of the response panel, showing `/` followed by the current query, a cursor indicator, and a dimmed hint `(Esc to cancel)`. The search bar SHALL always render at the bottom of the panel regardless of how much response content is visible — it SHALL NOT float after the last content line. When in normal mode with active matches (non-empty `searchMatches`), the search bar SHALL show the last query, the current match position as `[currentMatchIndex+1/totalMatches]`, and a dimmed hint `(Esc to dismiss)`. The response body content SHALL occupy all remaining vertical space above the search bar using a flex-growing container.

#### Scenario: Search bar during input
- **WHEN** the app is in search mode with query `'john'`
- **THEN** the search bar SHALL display `/{query}_  (Esc to cancel)` with the query and cursor in cyanBright/white and the hint in gray
- **AND** the search bar SHALL be rendered at the bottom edge of the response panel

#### Scenario: Search bar with active matches
- **WHEN** the app is in normal mode with `lastSearchQuery` = `'john'`, `currentMatchIndex` = `1`, and `searchMatches.length` = `3`
- **THEN** the search bar SHALL display `/john [2/3]  (Esc to dismiss)` with the match info in cyanBright and the hint in gray
- **AND** the search bar SHALL be rendered at the bottom edge of the response panel

#### Scenario: Search bar with no matches after search
- **WHEN** the app is in normal mode with `lastSearchQuery` = `'xyz'` and `searchMatches.length` = `0`
- **THEN** the search bar SHALL display `/xyz [No matches]  (Esc to dismiss)` with the match info in yellow and the hint in gray
- **AND** the search bar SHALL be rendered at the bottom edge of the response panel

#### Scenario: No search bar when no search state
- **WHEN** `lastSearchQuery` is empty and the app is in normal mode
- **THEN** no search bar SHALL be displayed
- **AND** the response body content SHALL fill the full available height

#### Scenario: Search bar position with short response content
- **WHEN** the response body has fewer lines than the panel height and search mode is active
- **THEN** the search bar SHALL still render at the bottom edge of the panel
- **AND** the space between the last content line and the search bar SHALL be empty (filled by the flex-growing content container)

#### Scenario: Search bar position with long response content
- **WHEN** the response body has more lines than the panel height and search mode is active
- **THEN** the search bar SHALL render at the bottom edge of the panel
- **AND** the response content SHALL be scrollable above the search bar
- **AND** the visible content line count SHALL equal `availableHeight - RESPONSE_PANEL_VERTICAL_CHROME - searchBarHeight`

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

## MODIFIED Requirements (refactor-test-reducer-extraction)

## MODIFIED Requirements

### Requirement: Search tests use real reducer
The test file `test/search.test.ts` SHALL import `reducer`, `createInitialState`, `CLEAR_SEARCH_STATE`, and `computeSearchScrollOffset` from `src/core/reducer.ts` instead of defining local copies. The local `reducer` function, `createInitialState` function, `CLEAR_SEARCH_STATE` constant, and `computeSearchScrollOffset` function SHALL be removed from the test file. All test assertions SHALL produce the same results as before (or reveal previously-masked bugs that should be fixed).

#### Scenario: search test imports real reducer
- **WHEN** `test/search.test.ts` is examined after the refactor
- **THEN** it SHALL contain `import { reducer, createInitialState, CLEAR_SEARCH_STATE, computeSearchScrollOffset } from '../src/core/reducer'` and SHALL NOT contain local definitions of those functions/constants

#### Scenario: search tests pass with real reducer
- **WHEN** `npm test -- search` is run
- **THEN** all tests SHALL pass (behavior preserved or bugs fixed)