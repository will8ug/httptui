## 1. Width selection helper

- [ ] 1.1 Add `getPanelContentWidth({ panel, maximizedPanel, columns })` to `src/utils/layout.ts` per design Decision 1 (requests → `getFullscreenRequestContentWidth`/`getRequestContentWidth`; response/details → `getFullscreenContentWidth`/`getResponseContentWidth`; guard `maximizedPanel === panel`), and verify `lsp_diagnostics` is clean
- [ ] 1.2 Add unit tests for the helper in `test/utils/layout.test.ts` covering: split view for each panel, maximized panel for each panel, `maximizedPanel` set to a *different* panel than the queried one (equality guard, design Decision 2), and the `MIN_*` floor at narrow widths — verify all pass

## 2. Reducer clamp fix

- [ ] 2.1 Replace the six clamp-width lookups in `src/core/reducers/navigation.ts` (`SCROLL_HORIZONTAL` response/details/requests branches and `JUMP_HORIZONTAL` requests/details/response branches) with `getPanelContentWidth`, and verify `lsp_diagnostics` is clean
- [ ] 2.2 Add reducer tests in `test/core/horizontal-scroll-boundary.test.ts`: maximized response panel at 200 columns — repeated `SCROLL_HORIZONTAL right` stops at `max(0, longestLine - getFullscreenContentWidth(200))`, asserting the expected offset value against the helper (spec scenario "Fullscreen response panel clamps at fullscreen width")
- [ ] 2.3 Add reducer tests for maximized requests panel (`SCROLL_HORIZONTAL right` stops at the fullscreen-request bound, ~164-cell correction at 200 columns) and maximized details panel, per spec scenarios
- [ ] 2.4 Add reducer tests in `test/core/edge-jump.test.ts`: `JUMP_HORIZONTAL end` with each panel maximized lands on the fullscreen bound; `JUMP_HORIZONTAL start` still resets to `0`; wrap-mode `JUMP_HORIZONTAL` remains a no-op; a constructed state with `maximizedPanel` different from `focusedPanel` uses the split width (equality guard)
- [ ] 2.5 Run the existing horizontal test suites (`test/core/horizontal-scroll-boundary.test.ts`, `test/core/edge-jump.test.ts`, `test/core/fullscreen-input.test.ts`, `test/core/details-scroll.test.ts`) and verify all pre-existing cases pass unmodified

## 3. Verification

- [ ] 3.1 Run the full test suite, lint, and build (`npm test`, `npm run lint`, `npm run build` or the repo equivalents) and verify exit code 0 with no new failures
- [ ] 3.2 Manual check in a wide terminal: maximize each panel (`f`), press `$` on a long-line response, and confirm the longest line's last character meets the right border in fullscreen; confirm split-view behavior is unchanged
