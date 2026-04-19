## 1. Layout Change in ResponseView

- [x] 1.1 Wrap the `{content}` block in `ResponseView.tsx` (line 350) inside a `<Box flexGrow={1} flexDirection="column">` container, so the response body fills remaining vertical space and pushes `{searchBar}` to the bottom edge of the panel
- [x] 1.2 Verify that the `visibleHeight` calculation (`availableHeight - RESPONSE_PANEL_VERTICAL_CHROME - searchBarHeight`) remains correct and no adjustment is needed after the flex layout change

## 2. Search Bar Escape Hint

- [x] 2.1 Add dimmed gray `(Esc to cancel)` hint to the search bar during active search input mode
- [x] 2.2 Add dimmed gray `(Esc to dismiss)` hint to the search bar when showing search results (both match and no-match states)

## 3. Verification

- [x] 3.1 Run `npm run build` and confirm zero errors
- [x] 3.2 Run `npm test` and confirm all existing tests pass (no regressions)
- [x] 3.3 Run `npm run lint` and confirm no new lint errors
- [ ] 3.4 Manually verify: with a short response (fewer lines than panel height), the search bar (`/` key) renders at the bottom edge of the panel — not immediately after the last content line *(requires interactive TUI)*
- [ ] 3.5 Manually verify: with a long response (more lines than panel height), scrolling and search bar positioning behave identically to before *(requires interactive TUI)*
