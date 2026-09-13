## 1. Width selection helper

- [x] 1.1 Add `getPanelContentWidth({ panel, maximizedPanel, columns })` to `src/utils/layout.ts` per design Decision 1 (requests → `getFullscreenRequestContentWidth`/`getRequestContentWidth`; response/details → `getFullscreenContentWidth`/`getResponseContentWidth`; guard `maximizedPanel === panel`), and verify `lsp_diagnostics` is clean
- [x] 1.2 Add unit tests for the helper in `test/utils/layout.test.ts` covering: split view for each panel, maximized panel for each panel, `maximizedPanel` set to a *different* panel than the queried one (equality guard, design Decision 2), and the `MIN_*` floor at narrow widths — verify all pass

## 2. Chrome constant verification (design Decision 5)

- [x] 2.1 Add a component test that empirically pins the response panel's true horizontal chrome: render the response panel at a known terminal width with a body line exactly `columns − 4` cells wide, and verify the border is neither overlapped nor displaced and the line is not wrapped or truncated — keeping this test as the permanent regression pin for the measured chrome
- [x] 2.2 Apply the measured outcome: if the true chrome is 4 cells, change `RESPONSE_PANEL_CHROME` from 6 to 4 in `src/utils/layout.ts`, rewrite its comment (dropping the "adjacent panel border overlap" rationale), and update the pinned `getResponseContentWidth` expectations in the `test/core/horizontal-scroll-boundary.test.ts` layout-helper tests (+2 cells); if the +2 proves load-bearing, keep 6 and rewrite the comment to state the actual reason — either way verify the full suite passes

## 3. Reducer clamp fix

- [x] 3.1 Replace the six clamp-width lookups in `src/core/reducers/navigation.ts` (`SCROLL_HORIZONTAL` response/details/requests branches and `JUMP_HORIZONTAL` requests/details/response branches) with `getPanelContentWidth`, and verify `lsp_diagnostics` is clean
- [x] 3.2 Add reducer tests in `test/core/horizontal-scroll-boundary.test.ts`: maximized response panel at 200 columns — repeated `SCROLL_HORIZONTAL right` stops at `max(0, longestLine - getPanelContentWidth(...))`, asserting the expected offset value against the helper (spec scenario "Fullscreen response panel clamps at fullscreen width")
- [x] 3.3 Add reducer tests for maximized requests panel (`SCROLL_HORIZONTAL right` stops at the fullscreen-request bound, ~164-cell correction at 200 columns) and maximized details panel, per spec scenarios
- [x] 3.4 Add reducer tests in `test/core/edge-jump.test.ts`: `JUMP_HORIZONTAL end` with each panel maximized lands on the fullscreen bound; `JUMP_HORIZONTAL start` still resets to `0`; wrap-mode `JUMP_HORIZONTAL` remains a no-op; a constructed state with `maximizedPanel` different from `focusedPanel` uses the split width (equality guard)
- [x] 3.5 Run the existing horizontal test suites (`test/core/horizontal-scroll-boundary.test.ts`, `test/core/edge-jump.test.ts`, `test/core/fullscreen-input.test.ts`, `test/core/details-scroll.test.ts`) and verify all pre-existing cases pass unmodified

## 4. Verification

- [x] 4.1 Run the full test suite, lint, and build (`npm test`, `npm run lint`, `npm run build` or the repo equivalents) and verify exit code 0 with no new failures
- [x] 4.2 Manual check in a wide terminal: maximize each panel (`f`), press `$` on a long-line response, and confirm the longest line's last character meets the right content edge exactly in fullscreen; confirm split-view behavior is unchanged (aside from the +2-cell budget widening if the chrome constant flipped)
