## 1. Line-total width threading

- [ ] 1.1 Change `getResponseTotalLines` in `src/utils/scroll.ts` to take `contentWidth` in its option bag (replacing `columns`, per design Decision 1), and update its two callers — `src/app/App.tsx` (status-bar total) and `computeVerticalMaxOffset` in `src/core/reducer.ts` — to derive it via `getPanelContentWidth({ panel: 'response', maximizedPanel: state.maximizedPanel, columns })`; verify `lsp_diagnostics` clean
- [ ] 1.2 Update `test/utils/scroll.test.ts` for the new option bag (mechanical: pass explicit `contentWidth`) and add cases: wrap-mode totals differ between split and fullscreen widths for the same body (fullscreen total smaller), nowrap totals identical at both widths; verify all pass

## 2. Search-jump width threading

- [ ] 2.1 In `src/app/input-handlers.ts`, switch `getBodyVisualStart`'s internal width derivation to `getPanelContentWidth` (design Decision 2) — no signature change; verify `lsp_diagnostics` clean
- [ ] 2.2 Add tests (in the appropriate existing search test file) covering the spec scenario "Scroll to match in a maximized response panel in wrap mode": `n`/`N` and search-Enter dispatch offsets computed from the fullscreen width when `maximizedPanel === 'response'`, landing on the visual line that displays the match; split-view behavior unchanged; verify all pass

## 3. Toggle reset

- [ ] 3.1 In `src/core/reducers/toggles.ts`, extend `TOGGLE_FULLSCREEN` to also reset `responseScrollOffset` to `0` when the response panel enters or leaves fullscreen (design Decision 3); verify `lsp_diagnostics` clean
- [ ] 3.2 Add reducer tests: entering response fullscreen resets `responseScrollOffset`; exiting response fullscreen resets it; toggling requests/details fullscreen leaves `responseScrollOffset` unchanged; verify all pass

## 4. Status bar

- [ ] 4.1 Add a test pinning the spec scenario "Response line total reflects the maximized layout in wrap mode": the status bar's response line total rendered for a maximized response panel in wrap mode equals the fullscreen-width visual-line count (smaller than the split total for the same body); verify it passes

## 5. Verification

- [ ] 5.1 Run the existing suites most likely to pin old behavior (`test/utils/scroll.test.ts`, `test/core/edge-jump.test.ts`, `test/core/fullscreen-input.test.ts`, search/status-bar component suites) and verify pre-existing cases pass or only mechanically-update where they pinned the old `columns`-based signature
- [ ] 5.2 Run the full test suite, lint, typecheck, and build (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`) and verify exit code 0 with no new failures
- [ ] 5.3 Manual check in a terminal: with a long wrapping response body, press `w` (wrap on), `f` (fullscreen) — the status bar total drops, `G` lands exactly at the last visual line with no blank space below, and `/query` + `n` lands on the matching visual line; exiting fullscreen resets the scroll to the top
