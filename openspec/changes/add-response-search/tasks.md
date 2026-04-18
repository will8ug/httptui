## 1. Types and State

- [ ] 1.1 Add `'search'` to `AppMode` union in `src/core/types.ts`
- [ ] 1.2 Add search state fields to `AppState`: `searchQuery: string`, `searchMatches: number[]`, `currentMatchIndex: number`, `lastSearchQuery: string`
- [ ] 1.3 Add search actions to `Action` union: `ENTER_SEARCH`, `UPDATE_SEARCH_INPUT`, `CONFIRM_SEARCH`, `CANCEL_SEARCH`, `NEXT_MATCH`, `PREV_MATCH`

## 2. Reducer Logic

- [ ] 2.1 Add `ENTER_SEARCH` case: set `mode: 'search'`, `focusedPanel: 'response'`, `searchQuery: ''` — only when `state.response` is not null
- [ ] 2.2 Add `UPDATE_SEARCH_INPUT` case: update `searchQuery` with new value
- [ ] 2.3 Add `CONFIRM_SEARCH` case: compute matches by splitting `formatResponseBody(response.body, rawMode)` by newlines, find lines where `line.toLowerCase().includes(query.toLowerCase())`, store match indices, set `currentMatchIndex: 0`, compute `responseScrollOffset` with header offset, set `lastSearchQuery`, return to `mode: 'normal'`. If query is empty, clear all search state.
- [ ] 2.4 Add `CANCEL_SEARCH` case: return to `mode: 'normal'`, clear all search state (`searchQuery`, `searchMatches`, `currentMatchIndex`, `lastSearchQuery`)
- [ ] 2.5 Add `NEXT_MATCH` case: increment `currentMatchIndex` with wrap-around (modulo `searchMatches.length`), update `responseScrollOffset` to scroll to new match. No-op if `searchMatches` is empty.
- [ ] 2.6 Add `PREV_MATCH` case: decrement `currentMatchIndex` with wrap-around, update `responseScrollOffset`. No-op if `searchMatches` is empty.
- [ ] 2.7 Clear search state in existing actions: `SEND_REQUEST`, `RECEIVE_RESPONSE`, `REQUEST_ERROR`, `SELECT_REQUEST`, `MOVE_SELECTION`, `TOGGLE_RAW`
- [ ] 2.8 Initialize search state fields in `createInitialState`: `searchQuery: ''`, `searchMatches: []`, `currentMatchIndex: 0`, `lastSearchQuery: ''`

## 3. Input Handling

- [ ] 3.1 Add search mode input branch in `useInput`: when `state.mode === 'search'`, handle Escape (cancel), Enter (confirm), Backspace (delete char), and printable chars (append to query)
- [ ] 3.2 Add `/` key handler in normal mode: dispatch `ENTER_SEARCH` (only when not in help or fileLoad mode)
- [ ] 3.3 Add `n` key handler in normal mode: dispatch `NEXT_MATCH` with computed `maxOffset` (only when `searchMatches.length > 0`)
- [ ] 3.4 Add `N` key handler in normal mode: dispatch `PREV_MATCH` with computed `maxOffset` (only when `searchMatches.length > 0`)

## 4. Response View Updates

- [ ] 4.1 Add new props to `ResponseView`: `searchMatches: number[]`, `currentMatchIndex: number`, `searchActive: boolean` (true when matches are present)
- [ ] 4.2 Render `►` prefix (cyanBright) on the current match line and `·` prefix (gray) on other matching lines — matching is done by body line index, offset by header count in the visual responseLines array
- [ ] 4.3 Reduce `visibleHeight` by 1 when the search bar should be displayed (search mode or active matches) to make room for the bar
- [ ] 4.4 Render inline search bar at the bottom of the response panel `Box`: show `/query_` during search mode, `/query [N/M]` or `/query [No matches]` during normal mode with active search state

## 5. Wiring in App.tsx

- [ ] 5.1 Pass new search-related props from `state` to `ResponseView`: `searchMatches`, `currentMatchIndex`, `searchActive`
- [ ] 5.2 Pass `mode` (or a derived `isSearchMode` boolean) to `ResponseView` for search bar rendering
- [ ] 5.3 Pass `lastSearchQuery` to `ResponseView` for search bar display text

## 6. Shortcuts

- [ ] 6.1 Add three entries to `SHORTCUTS` in `src/core/shortcuts.ts`: `/` (Search response body), `n` (Go to next search match), `N` (Go to previous search match) — all with `showInBar: false`, `showInHelp: true`

## 7. Tests

- [ ] 7.1 Add reducer unit tests for all 6 new action types: `ENTER_SEARCH`, `UPDATE_SEARCH_INPUT`, `CONFIRM_SEARCH`, `CANCEL_SEARCH`, `NEXT_MATCH`, `PREV_MATCH`
- [ ] 7.2 Add reducer tests for search state clearing on `SEND_REQUEST`, `RECEIVE_RESPONSE`, `REQUEST_ERROR`, `SELECT_REQUEST`, `MOVE_SELECTION`, `TOGGLE_RAW`
- [ ] 7.3 Add tests for match computation: case-insensitive matching, no matches, empty query, multi-line body
- [ ] 7.4 Add tests for wrap-around behavior on `NEXT_MATCH` and `PREV_MATCH`
- [ ] 7.5 Add test for `ENTER_SEARCH` no-op when `response` is null

## 8. Build and Verify

- [ ] 8.1 Run `npm run build` and verify no compilation errors
- [ ] 8.2 Run `npm test` and verify all tests pass (including new tests)
- [ ] 8.3 Run `npm run lint` and fix any lint errors
