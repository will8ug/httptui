## Context

httptui renders HTTP responses in a scrollable right panel (`ResponseView`). Users can scroll vertically/horizontally and toggle wrap/raw modes, but have no way to search within a response. For large JSON payloads, manually scanning for a value is tedious.

The app uses a single `useReducer` in `app.tsx` with an `AppMode` discriminant (`'normal' | 'fileLoad'`) to manage modal input states. The `fileLoad` mode already demonstrates the pattern for capturing text input without external components — character-by-character via `useInput`, with backspace/Enter/Escape handling.

## Goals / Non-Goals

**Goals:**
- Let users search response body text via `/` → type query → Enter
- Navigate matches with `n` (next) / `N` (previous) with wrap-around
- Show which line matches via a `►` gutter indicator, with the current match's line scrolled into view
- Display an inline search bar showing the query and match count

**Non-Goals:**
- Substring highlighting within lines (deferred — requires splitting the colorizeJson segment pipeline)
- Regex search (plain case-insensitive substring matching only)
- Searching headers or status line (body only)
- Searching the request list panel or details panel
- Persisting search state across request switches

## Decisions

### 1. Search mode as an AppMode variant, not an overlay

**Decision**: Extend `AppMode` to `'normal' | 'fileLoad' | 'search'` and handle search input in the same `useInput` handler, following the `fileLoad` pattern.

**Rationale**: The `fileLoad` mode already proves this works — character-by-character input capture, Escape to cancel, Enter to confirm. An overlay would obscure the response content, defeating the purpose. The search bar renders inline at the bottom of `ResponseView` instead.

**Alternative considered**: Using `@inkjs/ui` `TextInput` component. Rejected because the app deliberately avoids it (fileLoad uses manual input), and introducing it would add a control-flow inconsistency.

### 2. Match computation against raw body lines in the reducer

**Decision**: Compute matches in the reducer's `CONFIRM_SEARCH` action by splitting `state.response.body` (after `formatResponseBody`) into lines and checking `line.toLowerCase().includes(query.toLowerCase())`.

**Rationale**: The reducer already has access to `state.response` and `state.rawMode`. Computing matches here keeps it pure and testable. The alternative — computing in `ResponseView` and passing back via callback — fights React's top-down data flow.

**Trade-off**: The reducer duplicates knowledge of how body lines are split (same `split('\n')` as ResponseView). Acceptable for v1 since it's a single `split` call, not the full rendering pipeline.

### 3. Arrow gutter indicator instead of substring highlighting

**Decision**: Mark matching lines with a `►` prefix character. The current match gets `►` in a bright color; other matches get `·` in a dim color.

**Rationale**: Substring highlighting requires splitting `colorizeJson` segments at match character boundaries — significantly more complex. The gutter indicator works at line granularity, requiring zero changes to the existing rendering pipeline. Users' eyes naturally find the search term once scrolled to the right line.

### 4. Visual line offset computation for scroll-to-match

**Decision**: When jumping to a match, compute the visual line index as `bodyLineIndex + headerOffset`, where `headerOffset = 1 (status) + (verbose ? Object.keys(headers).length : 0) + 1 (separator)`. Set `responseScrollOffset` to this value (clamped to max).

**Rationale**: ResponseView builds lines in order: status → headers (if verbose) → separator → body. The search matches are against body line indices, so we need the offset to scroll the response panel correctly. In wrap mode, this is approximate (a wrapped body line may span multiple visual lines), but it gets the user close enough for v1.

### 5. Search state cleared on request change

**Decision**: When `SEND_REQUEST`, `RECEIVE_RESPONSE`, or `SELECT_REQUEST` fires, clear all search state (matches, query, index).

**Rationale**: Search results are tied to the current response body. Stale matches after a new response would be confusing. The user can re-search with `/` after the new response arrives.

## Risks / Trade-offs

- **[Wrap mode scroll imprecision]** → In wrap mode, a single body line may span multiple visual lines. Scroll-to-match targets the logical line, not the exact visual line. Mitigation: acceptable for v1; user is scrolled close to the match and can fine-tune with j/k.
- **[Large response performance]** → `split('\n').filter(includes)` on a 10k+ line response runs on every Enter. Mitigation: this is a synchronous string scan — fast enough for any realistic HTTP response body. If it ever matters, debouncing or incremental search can be added later.
- **[formatResponseBody dependency]** → Match computation uses `formatResponseBody(response.body, rawMode)` to match what the user sees. If raw mode changes after search, matches become stale. Mitigation: clear search state on `TOGGLE_RAW` as well.
