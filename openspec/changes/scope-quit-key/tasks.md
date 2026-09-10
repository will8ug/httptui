## 1. Implementation

- [ ] 1.1 In `src/app/input-handlers.ts`, replace the `q` branch inside `handleNormalInput` (currently lines 632-639) with the version in design.md — Implementation. The new dismiss check uses `state.searchMatches.length > 0 || state.lastSearchQuery` and returns before the `hasUnsavedChanges` check. Verify `npm run typecheck` passes and the Escape ladder at lines 611-625, the `Ctrl+C` branch at 627-630, and `handleSearchInput` are all textually unchanged.

## 2. Reducer-level coverage

- [ ] 2.1 In `test/core/search.test.ts`, add a describe block covering dismissal from a state built by the existing `stateWithActiveSearch()` helper (lines 22-30), mirroring the structure of the `Escape dismisses active search results in normal mode` block at lines 322-346. Cover both the active-matches case and the `lastSearchQuery`-set-with-empty-`searchMatches` case. Verify the new tests pass under `npm test`.

## 3. Integration coverage

No integration test currently reaches the "search results displayed in normal mode" state through real keypresses, so these tests must drive `/`, the query, and Enter before pressing `q`. Use the `press` helper from `test/helpers/integration.tsx` (lines 31-35); `press(stdin, 'q')` is the established form, as used at `test/integration/unsaved-changes.test.tsx:119`.

- [ ] 3.1 In `test/integration/search.test.tsx`, add a test asserting that `q` with active matches clears the search bar and match markers and leaves the app rendering. Verify the frame no longer contains `(Esc to dismiss)` and that the app has not exited.
- [ ] 3.2 In the same file, add a test asserting that `q` dismisses the no-match bar — search for a string absent from the body, confirm the frame shows `[No matches]`, then press `q` and verify the bar is gone and the app still renders.
- [ ] 3.3 In the same file, add a test asserting that a second `q`, pressed after the first dismissed the results, exits the application. Verify against the existing `Esc is a no-op in normal mode without search state` test at lines 46-60 for how this file asserts on a still-rendering app.
- [ ] 3.4 In the same file, add a test asserting that `q` with a panel maximized and matches active clears the results and leaves the panel maximized. Verify the frame still hides the non-maximized panels and no longer shows the search bar.
- [ ] 3.5 In `test/integration/unsaved-changes.test.tsx`, add a test asserting that `q` on a modified file with search results displayed dismisses the results, shows no `Unsaved Changes` prompt, and does not exit. Verify the `*` dirty marker is still present afterwards.
- [ ] 3.6 In the same file, add a test asserting that the next `q` after that dismissal does show the `Unsaved Changes` prompt with the `quitting` description. Verify it passes alongside the existing `q while dirty shows the prompt instead of exiting` test at lines 114-123, which must remain green unmodified.

## 4. Documentation

- [ ] 4.1 In `README.md`, add an `Escape` row to the Search table (lines 136-142) for dismissing search results, and a `q` row for the same. The table currently lists only `/`, `n`, and `N`, documenting no way to leave search. Verify the rendered table lists five keys.
- [ ] 4.2 In `README.md`, extend the `Escape` row of the General table (line 96) to include search dismissal, which it omits today despite the behavior being implemented and specified. Verify the row names search alongside overlay, in-flight request, and fullscreen.
- [ ] 4.3 In `README.md`, qualify the `q` row of the General table (line 97) so it reads as dismissing search results before quitting. Verify it no longer claims `q` unconditionally quits.
- [ ] 4.4 In `openspec/specs/tui/spec.md`, revise the `## Exit` prose (lines 73-77) so the `q` bullet is qualified and cross-references the **response-search** spec, following the style already used by that file's `## File Reload` and `## File Load` sections (lines 79-85). This section is prose in an interface map, not a requirement, so it is edited in place and carries no delta. Verify no `### Requirement:` block in that file is touched.

## 5. Verification

- [ ] 5.1 Run `npm run typecheck` and `npm run typecheck:test` and verify both pass.
- [ ] 5.2 Run `npm run lint` and verify it reports no new findings.
- [ ] 5.3 Run `npm test` and verify the full suite passes. Confirm specifically that these text-coupled assertions are still green, since the shortcut registry was intentionally left unmodified: `test/core/shortcuts.test.ts:44` (the six bar-visible keys, including `q`), `test/integration/edge-jump.test.tsx:103` (`[q] Quit` in the status bar), and `test/components/HelpOverlay.test.tsx:35` (`Quit application` in the help overlay).
- [ ] 5.4 Run `openspec validate "scope-quit-key" --strict` and verify it reports the change is valid.
- [ ] 5.5 Exercise the original report by hand: load a file, send a request, press `/`, type a term present in the body, press Enter, then press `q`. Verify the search bar and match markers disappear and the application is still running, then press `q` again and verify it exits.
