## 1. Extract shared integration helpers

- [ ] 1.1 Create `test/helpers/integration.ts` — export `renderApp(overrides?: Partial<AppProps>)`, `press(stdin, key)`, `delay(ms)`, `selectedLine(frame)`, and `KEY_DELAY_MS`. The `renderApp` default should produce an `AppProps` with empty `requests`, empty `variables`, `filePath: 'test.http'`, `executorConfig: { insecure: false }`, allowing overrides via spread.
- [ ] 1.2 Update existing `test/edge-jump-integration.test.tsx` — replace inlined `renderApp`, `press`, `delay`, `selectedLine`, `makeShortUrlRequests`, `makeLongUrlRequests` with imports from `./helpers/integration` and `./helpers/requests`. Run `npx vitest run test/edge-jump-integration.test.tsx` to verify.

## 2. Move existing integration test to `test/integration/`

- [ ] 2.1 Create `test/integration/` directory.
- [ ] 2.2 `git mv test/edge-jump-integration.test.tsx test/integration/edge-jump.test.tsx` (preserves git history).
- [ ] 2.3 Update import paths in moved file — imports of `./helpers/integration` and `./helpers/requests` become `../helpers/integration` and `../helpers/requests`.
- [ ] 2.4 Run `npx vitest run test/integration/edge-jump.test.tsx` to verify.

## 3. Add toggles integration tests

- [ ] 3.1 Create `test/integration/toggles.test.tsx` — cover `v` (verbose), `w` (wrap), `r` (raw), `d` (details panel), `?` (help overlay open/close). Use `lastFrame()` assertions on semantic markers (status bar text, panel visibility, overlay content) rather than pixel-exact output.
- [ ] 3.2 Run `npx vitest run test/integration/toggles.test.tsx`; iterate until green.

## 4. Add navigation integration tests

- [ ] 4.1 Create `test/integration/navigation.test.tsx` — cover `j`/`k`/arrows (selection movement), `Tab` (panel focus cycling). Use `selectedLine()` helper from `./helpers/integration` to assert on selection.
- [ ] 4.2 Run `npx vitest run test/integration/navigation.test.tsx`; iterate until green.

## 5. Add file-load integration tests

- [ ] 5.1 Create `test/integration/file-load.test.tsx` — cover `o` (opens overlay), text input (typing accumulates), `Enter` with invalid path (error shown), `Esc` (cancels overlay). Use a non-existent path to trigger the error branch deterministically. Do NOT test the happy-path file-read against disk in this file (covered in reload test).
- [ ] 5.2 Run `npx vitest run test/integration/file-load.test.tsx`; iterate until green.

## 6. Add reload integration tests

- [ ] 6.1 Create `test/integration/reload.test.tsx` — use a temporary `.http` file (write via `fs` + `os.tmpdir()` in a `beforeEach`/`afterEach`) and verify `R` reloads its contents, showing "Reloaded" in the status bar briefly.
- [ ] 6.2 Run `npx vitest run test/integration/reload.test.tsx`; iterate until green.

## 7. Add search integration tests

- [ ] 7.1 Create `test/integration/search.test.tsx` — cover `/` (enter search mode), typing query, `Enter` (confirm with matches), `n`/`N` (advance/previous), `Esc` (dismiss). Use a pre-constructed `ResponseData` (not a real HTTP request) supplied via `App` props or by mocking the executor — BUT note: `App` doesn't accept a pre-loaded response via props. SIMPLEST APPROACH: use the existing executor mock pattern from `test/executor.test.ts` + `vi.mock('../../src/core/executor')` to return a deterministic response, then press `Enter` to trigger a "send" before running search. Document this approach as a choice in the test file comments.
- [ ] 7.2 If mocking the executor in integration context proves too complex, fall back to testing only the search-mode-entry path (`/` → search bar visible) and cover match navigation via the existing `search.test.ts` unit tests. Document the decision.
- [ ] 7.3 Run `npx vitest run test/integration/search.test.tsx`; iterate until green.

## 8. Verify all integration tests pass together

- [ ] 8.1 Run `npm test` — verify all 16+ test files pass (13 existing + 6 integration, minus any deletions pending).
- [ ] 8.2 Time the suite — if integration tests push total runtime above ~10s, investigate reducing `KEY_DELAY_MS` in shared helper.

## 9. Delete redundant unit tests (wrap-toggle)

- [ ] 9.1 In `test/wrap-toggle.test.ts`, delete the 4 "dispatch-action, check-field" tests. Keep only the "preserves other state fields" invariants test.
- [ ] 9.2 Run `npx vitest run test/wrap-toggle.test.ts` — verify remaining test passes.

## 10. Delete redundant unit tests (reload)

- [ ] 10.1 In `test/reload.test.ts`, delete simple dispatch tests (e.g., "replaces requests and variables", "clears response and error", "sets reloadMessage to 'Reloaded'", "clears the reload message"). Keep name-based selection preservation, reset-to-0 on name-not-found, and `CLEAR_RELOAD_MESSAGE` invariant tests.
- [ ] 10.2 Run `npx vitest run test/reload.test.ts` — verify remaining tests pass.

## 11. Delete redundant unit tests (file-load)

- [ ] 11.1 In `test/file-load.test.ts`, delete happy-path dispatch tests (e.g., "sets mode to fileLoad and clears input and error", "appends characters to the input", "sets the error message", "replaces requests, variables, and filePath", "clears response, error, and scroll offsets", "sets mode to normal and clears fileLoadInput and fileLoadError", "sets reloadMessage with basename of filePath", "resets mode to normal and clears input and error"). Keep name-based reselection, name-not-found reset, mode-retention-after-error, and invariant tests.
- [ ] 11.2 Run `npx vitest run test/file-load.test.ts` — verify remaining tests pass.

## 12. Delete redundant unit tests (edge-jump)

- [ ] 12.1 In `test/edge-jump.test.ts`, delete tests that duplicate coverage already provided by `test/integration/edge-jump.test.tsx`. Specifically: the basic "press g → selectedIndex becomes 0" and "press G → selectedIndex becomes N-1" cases for the requests panel. Keep all tests covering: `maxOffset` clamping for details/response panels, `wrapMode === 'wrap'` guard on `JUMP_HORIZONTAL`, empty-requests edge cases, and multi-panel branching logic.
- [ ] 12.2 Run `npx vitest run test/edge-jump.test.ts` — verify remaining tests pass.

## 13. Final verification and documentation

- [ ] 13.1 Run `npm run build && npm test` — verify full build and all tests pass.
- [ ] 13.2 Update `AGENTS.md` — add `test/integration/` to the test directory description. Add `test/helpers/integration.ts` to the test helpers list. Add a brief note in the Testing section describing the three tiers (pure unit / reducer unit / integration) and when to use each.
- [ ] 13.3 Confirm `lsp_diagnostics` clean across all new and modified files.