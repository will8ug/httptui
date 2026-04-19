## 1. Extract shared integration helpers

- [x] 1.1 Create `test/helpers/integration.ts` (created as `.tsx` since file contains JSX) — export `renderApp(overrides?: Partial<AppProps>)`, `press(stdin, key)`, `delay(ms)`, `selectedLine(frame)`, and `KEY_DELAY_MS`. The `renderApp` default should produce an `AppProps` with empty `requests`, empty `variables`, `filePath: 'test.http'`, `executorConfig: { insecure: false }`, allowing overrides via spread.
- [x] 1.2 Update existing `test/edge-jump-integration.test.tsx` — replace inlined `renderApp`, `press`, `delay`, `selectedLine`, `makeShortUrlRequests`, `makeLongUrlRequests` with imports from `./helpers/integration` and `./helpers/requests`. Run `npx vitest run test/edge-jump-integration.test.tsx` to verify.

## 2. Move existing integration test to `test/integration/`

- [x] 2.1 Create `test/integration/` directory.
- [x] 2.2 `git mv test/edge-jump-integration.test.tsx test/integration/edge-jump.test.tsx` (preserves git history).
- [x] 2.3 Update import paths in moved file — imports of `./helpers/integration` and `./helpers/requests` become `../helpers/integration` and `../helpers/requests`.
- [x] 2.4 Run `npx vitest run test/integration/edge-jump.test.tsx` to verify.

## 3. Add toggles integration tests

- [x] 3.1 Create `test/integration/toggles.test.tsx` — cover `v` (verbose), `w` (wrap), `r` (raw), `d` (details panel), `?` (help overlay open/close). Use `lastFrame()` assertions on semantic markers (status bar text, panel visibility, overlay content) rather than pixel-exact output.
- [x] 3.2 Run `npx vitest run test/integration/toggles.test.tsx`; iterate until green.

## 4. Add navigation integration tests

- [x] 4.1 Create `test/integration/navigation.test.tsx` — cover `j`/`k`/arrows (selection movement), `Tab` (panel focus cycling). Use `selectedLine()` helper from `./helpers/integration` to assert on selection.
- [x] 4.2 Run `npx vitest run test/integration/navigation.test.tsx`; iterate until green.

## 5. Add file-load integration tests

- [x] 5.1 Create `test/integration/file-load.test.tsx` — cover `o` (opens overlay), text input (typing accumulates), `Enter` with invalid path (error shown), `Esc` (cancels overlay). Use a non-existent path to trigger the error branch deterministically. Do NOT test the happy-path file-read against disk in this file (covered in reload test).
- [x] 5.2 Run `npx vitest run test/integration/file-load.test.tsx`; iterate until green.

## 6. Add reload integration tests

- [x] 6.1 Create `test/integration/reload.test.tsx` — use a temporary `.http` file (write via `fs` + `os.tmpdir()` in a `beforeEach`/`afterEach`) and verify `R` reloads its contents, showing "Reloaded" in the status bar briefly.
- [x] 6.2 Run `npx vitest run test/integration/reload.test.tsx`; iterate until green.

## 7. Add search integration tests

- [x] 7.1 Create `test/integration/search.test.tsx` — cover `/` (enter search mode), typing query, `Enter` (confirm with matches), `n`/`N` (advance/previous), `Esc` (dismiss). Use a pre-constructed `ResponseData` (not a real HTTP request) supplied via `App` props or by mocking the executor — BUT note: `App` doesn't accept a pre-loaded response via props. SIMPLEST APPROACH: use the existing executor mock pattern from `test/executor.test.ts` + `vi.mock('../../src/core/executor')` to return a deterministic response, then press `Enter` to trigger a "send" before running search. Document this approach as a choice in the test file comments.
- [x] 7.2 If mocking the executor in integration context proves too complex, fall back to testing only the search-mode-entry path (`/` → search bar visible) and cover match navigation via the existing `search.test.ts` unit tests. Document the decision.
- [x] 7.3 Run `npx vitest run test/integration/search.test.tsx`; iterate until green.

## 8. Verify all integration tests pass together

- [x] 8.1 Run `npm test` — verify all 16+ test files pass (13 existing + 6 integration, minus any deletions pending).
- [x] 8.2 Time the suite — if integration tests push total runtime above ~10s, investigate reducing `KEY_DELAY_MS` in shared helper.

## 9. Delete redundant unit tests (wrap-toggle)

- [x] 9.1 In `test/wrap-toggle.test.ts`, delete the 2 pure happy-path toggle-direction tests. Keep the 2 scroll-offset reset tests (boundary behavior) and the invariants test. (5 → 3 tests)
- [x] 9.2 Run `npx vitest run test/wrap-toggle.test.ts` — verify remaining test passes.

## 10. Delete redundant unit tests (reload)

- [x] 10.1 In `test/reload.test.ts`, deleted 3 simple dispatch tests: "replaces requests and variables", "sets reloadMessage to 'Reloaded'", "clears the reload message". Kept: name-based selection preservation, name-not-found reset, clears-response-and-error (cross-field invariant), and CLEAR_RELOAD_MESSAGE invariants test. (7 → 4 tests)
- [x] 10.2 Run `npx vitest run test/reload.test.ts` — verify remaining tests pass.

## 11. Delete redundant unit tests (file-load)

- [x] 11.1 In `test/file-load.test.ts`, deleted 6 happy-path dispatch tests. Kept: clears-previous-input-and-error (invariant on stale state), stays-in-fileLoad-mode-after-error, preserves-selection-by-name, resets-selection-when-name-not-found, clears-response-and-scroll-offsets (cross-field invariant), sets-reloadMessage-with-basename, does-not-change-requests-or-filePath. (13 → 7 tests)
- [x] 11.2 Run `npx vitest run test/file-load.test.ts` — verify remaining tests pass.

## 12. Delete redundant unit tests (edge-jump)

- [x] 12.1 In `test/edge-jump.test.ts`, deleted 3 pure happy-path dispatch tests for the requests panel (JUMP_VERTICAL start/end, JUMP_HORIZONTAL start). Kept all 17 boundary-math, maxOffset clamping, wrap-mode guard, cross-panel branching, and default-columns tests. (20 → 17 tests)
- [x] 12.2 Run `npx vitest run test/edge-jump.test.ts` — verify remaining tests pass.

## 13. Final verification and documentation

- [x] 13.1 Run `npm run build && npm test` — verify full build and all tests pass.
- [x] 13.2 Update `AGENTS.md` — add `test/integration/` to the test directory description. Add `test/helpers/integration.ts` to the test helpers list. Add a brief note in the Testing section describing the three tiers (pure unit / reducer unit / integration) and when to use each.
- [x] 13.3 Confirm `lsp_diagnostics` clean across all new and modified files.
