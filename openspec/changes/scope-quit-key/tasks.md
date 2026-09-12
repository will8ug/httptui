## 1. Implementation

- [x] 1.1 In `src/app/input-handlers.ts`, replace the `q` branch inside `handleNormalInput` (currently lines 632-639) with the version in design.md — Implementation. The new dismiss check uses `state.searchMatches.length > 0 || state.lastSearchQuery` and returns before the `hasUnsavedChanges` check. Verify `npm run typecheck` passes and the Escape ladder at lines 611-625, the `Ctrl+C` branch at 627-630, and `handleSearchInput` are all textually unchanged.

## 2. Reducer-level coverage

- [x] 2.1 Revised during apply: the reducer cannot distinguish which key dispatched `CANCEL_SEARCH`, and `test/core/search.test.ts` lines 322-346 already covers both dismissal cases, so a `q`-flavored duplicate would add nothing. Rename the `Escape dismisses active search results in normal mode` describe block to a key-agnostic name instead, since `q` now also routes here. Verify `npm test -- test/core/search.test.ts` passes.

## 3. Integration coverage

No integration test previously reached the "search results displayed in normal mode" state through real keypresses, so these tests drive `/`, the query, and Enter before pressing `q`. Revised during apply: they live in a new `test/integration/search-dismiss.test.tsx` (the existing `search.test.tsx` is scoped to guarded no-response behavior, and reaching a response requires the `vi.hoisted`/`vi.mock('undici')` pattern from `response-search-wrap.test.tsx`). Asserting that the app exited required a `useApp().exit` spy via `vi.mock('ink')`, since `ink-testing-library` exposes no exit observation — the first exit assertion anywhere in this suite.

- [x] 3.1 In `test/integration/search-dismiss.test.tsx`, a test asserting that `q` with active matches clears the search bar and match markers and leaves the app rendering. Verified: the frame no longer contains `(Esc to dismiss)` or the `►` marker, and the exit spy was not called.
- [x] 3.2 In the same file, a test asserting that `q` dismisses the no-match bar — searches for an absent string, confirms the frame shows `[No matches]`, then presses `q` and verifies the bar is gone, the app still renders, and the exit spy was not called.
- [x] 3.3 In the same file, a test asserting that a second `q`, pressed after the first dismissed the results, calls the exit spy exactly once.
- [x] 3.4 In the same file, a test asserting that `q` with the response panel maximized and matches active clears the results and leaves the panel maximized (`Response` present, `Requests` absent before and after). Note: `ENTER_SEARCH` already focuses the response panel, so maximizing needs only `f`, not `Tab` first.
- [x] 3.5 In `test/integration/unsaved-changes.test.tsx`, a test asserting that `q` on a modified file with search results displayed dismisses the results, shows no `Unsaved Changes` prompt, does not exit, and leaves the `*` dirty marker present. The file gained the `undici` mock (inert for its existing no-network tests).
- [x] 3.6 In the same file, a test asserting that the next `q` after that dismissal shows the `Unsaved Changes` prompt with the `quitting` description. The existing `q while dirty shows the prompt instead of exiting` test passes green and unmodified.

## 4. Documentation

- [x] 4.1 In `README.md`, add an `Escape` row to the Search table (lines 136-142) for dismissing search results, and a `q` row for the same. The table currently lists only `/`, `n`, and `N`, documenting no way to leave search. Verify the rendered table lists five keys.
- [x] 4.2 In `README.md`, extend the `Escape` row of the General table (line 96) to include search dismissal, which it omits today despite the behavior being implemented and specified. Verify the row names search alongside overlay, in-flight request, and fullscreen.
- [x] 4.3 In `README.md`, qualify the `q` row of the General table (line 97) so it reads as dismissing search results before quitting. Verify it no longer claims `q` unconditionally quits.
- [x] 4.4 In `openspec/specs/tui/spec.md`, revise the `## Exit` prose (lines 73-77) so the `q` bullet is qualified and cross-references the **response-search** spec, following the style already used by that file's `## File Reload` and `## File Load` sections (lines 79-85). This section is prose in an interface map, not a requirement, so it is edited in place and carries no delta. Verify no `### Requirement:` block in that file is touched.

## 5. Verification

- [x] 5.1 Run `npm run typecheck` and `npm run typecheck:test` and verify both pass.
- [x] 5.2 Run `npm run lint` and verify it reports no new findings.
- [x] 5.3 Run `npm test` and verify the full suite passes. Confirm specifically that these text-coupled assertions are still green, since the shortcut registry was intentionally left unmodified: `test/core/shortcuts.test.ts:44` (the six bar-visible keys, including `q`), `test/integration/edge-jump.test.tsx:103` (`[q] Quit` in the status bar), and `test/components/HelpOverlay.test.tsx:35` (`Quit application` in the help overlay).
- [x] 5.4 Run `openspec validate "scope-quit-key" --strict` and verify it reports the change is valid.
- [ ] 5.5 Exercise the original report by hand: load a file, send a request, press `/`, type a term present in the body, press Enter, then press `q`. Verify the search bar and match markers disappear and the application is still running, then press `q` again and verify it exits.
