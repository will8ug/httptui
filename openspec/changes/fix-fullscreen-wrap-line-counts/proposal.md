## Why

While the response panel is maximized in wrap mode, every vertical-axis computation that depends on wrap expansion still uses the split-layout width: the status bar's `x/y lines` total, the `G` jump-to-bottom bound, and the `n`/`N` + search-Enter scroll targets. The panel itself wraps at the fullscreen width, so counts and targets computed at the narrower split width are wrong — totals too high, jumps landing short of the content bottom or on the wrong visual line. Additionally, `TOGGLE_FULLSCREEN` resets horizontal offsets but never adjusts `responseScrollOffset`, which can leave the viewport scrolled past the end after entering fullscreen (blank space below content).

## What Changes

- `getResponseTotalLines` accepts the panel's content width (replacing its internal split-width derivation); its callers — the status-bar line total and the `G` vertical-jump bound — derive it via `getPanelContentWidth`, so both reflect the panel's current layout (split or fullscreen).
- `getBodyVisualStart` (search match → visual-line mapping) derives width the same way, so `n`/`N` and search-Enter scroll to the visual line actually displaying the match when the response panel is maximized in wrap mode.
- `TOGGLE_FULLSCREEN` resets `responseScrollOffset` to `0` when the response panel enters or leaves fullscreen, mirroring the existing horizontal-offset reset semantics.
- Navigation spec cleanup carried over by agreement: the `JUMP_VERTICAL action` and `Keyboard bindings for edge-jump navigation` requirements are reworded to observable behavior (helper names and payload-shape leaks removed), with a new scenario pinning the fullscreen `G` bound.
- The status-bar spec's `Context-aware status text` requirement now pins that the response line indicator's total reflects the panel's current layout.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `navigation`: `JUMP_VERTICAL action` and `Keyboard bindings for edge-jump navigation` requirements reworded to observable behavior; new scenario — the `G` bound reflects the maximized panel's wrap expansion.
- `response-search`: the `Scroll-to-match adjusts for visual-line layout` requirement counts visual lines at the panel's current layout width, with a new maximized-panel wrap scenario.
- `status-bar`: the `Context-aware status text` requirement pins that the response line indicator's total reflects the panel's current layout's wrap expansion.
- `fullscreen-panel`: the `TOGGLE_FULLSCREEN action` requirement additionally resets `responseScrollOffset` when the response panel toggles fullscreen.

## Impact

- Code: `src/utils/scroll.ts` (`getResponseTotalLines` option bag takes `contentWidth`), `src/app/App.tsx` (status-bar total), `src/core/reducer.ts` (`computeVerticalMaxOffset`), `src/app/input-handlers.ts` (`getBodyVisualStart`), `src/core/reducers/toggles.ts` (scroll-offset reset). No component or action-contract changes.
- Tests: `test/utils/scroll.test.ts` (signature), new cases for maximized wrap totals, search-jump targets, and the toggle reset; pre-existing suites must stay green except mechanical updates to `getResponseTotalLines` callers in tests.
- Non-goals: vertical offsets of the requests/details panels on fullscreen toggle (a height concern, not wrap-width; the request list self-corrects via selection clamping); re-clamping offsets on terminal resize; changing horizontal action contracts (option C, previously rejected).
