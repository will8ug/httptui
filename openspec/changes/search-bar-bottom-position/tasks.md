## 1. Layout Change in ResponseView

- [ ] 1.1 Wrap the `{content}` block in `ResponseView.tsx` (line 350) inside a `<Box flexGrow={1} flexDirection="column">` container, so the response body fills remaining vertical space and pushes `{searchBar}` to the bottom edge of the panel
- [ ] 1.2 Verify that the `visibleHeight` calculation (`availableHeight - RESPONSE_PANEL_VERTICAL_CHROME - searchBarHeight`) remains correct and no adjustment is needed after the flex layout change

## 2. Verification

- [ ] 2.1 Run `npm run build` and confirm zero errors
- [ ] 2.2 Run `npm test` and confirm all existing tests pass (no regressions)
- [ ] 2.3 Run `npm run lint` and confirm no new lint errors
- [ ] 2.4 Manually verify: with a short response (fewer lines than panel height), the search bar (`/` key) renders at the bottom edge of the panel — not immediately after the last content line
- [ ] 2.5 Manually verify: with a long response (more lines than panel height), scrolling and search bar positioning behave identically to before
