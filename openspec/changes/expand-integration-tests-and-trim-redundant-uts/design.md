## Context

After the `refactor-test-reducer-extraction` change, the test suite has three tiers:

- **Tier 1** (healthy): Pure utilities (`parser`, `variables`, `executor`, `wrap`, `scroll`, `cli-args`, `cli-smoke`, `shortcuts`). No changes.
- **Tier 2** (reducer unit tests): Dispatch an action, check state (`details-scroll`, `search`, `edge-jump`, `file-load`, `horizontal-scroll-boundary`, `reload`, `wrap-toggle`). These exercise the real exported reducer now — good. But some tests duplicate behavior an integration test covers better.
- **Tier 3** (integration): Only one file — `test/edge-jump-integration.test.tsx` (153 lines) — covers 4 keybindings (`g`, `G`, `$`, `0`).

The `useInput` handler in `src/app.tsx` dispatches ~25 distinct keybindings but only 4 are integration-tested. Refactoring dispatch logic can break the app with zero unit test failures.

## Goals / Non-Goals

**Goals:**
- Add integration tests covering the full keybinding dispatch surface for toggles, file-load overlay, reload, and search.
- Extract shared integration helpers (`renderApp`, `press`, `delay`, `selectedLine`) so new and existing integration tests share them.
- Delete unit tests that are now pure duplication of integration coverage, keeping unit tests that catch boundary math and exhaustive edge cases.
- Improve `useInput` dispatch coverage from ~20% to ~80%.

**Non-Goals:**
- Refactoring production code (`src/app.tsx`, reducer, components). This is test-suite work only.
- Extracting `useInput` into a pure function (Path B considered earlier, explicitly deferred).
- Rewriting Tier 1 unit tests (parser, variables, executor). Those are already at the right level.
- Adding integration coverage for scroll-math boundary cases. Those stay as Tier 2 unit tests (faster, more exhaustive).
- Writing integration tests for pre-existing edge cases that don't already have unit coverage. This change preserves parity, not expands it.

## Decisions

### Decision 1: Extract helpers to `test/helpers/integration.ts`

**Choice:** Create `test/helpers/integration.ts` exporting `renderApp(props?)`, `press(stdin, key)`, `delay(ms)`, `selectedLine(frame)`, and the `KEY_DELAY_MS` constant.

**Rationale:** `test/edge-jump-integration.test.tsx` has these inline. New integration test files would duplicate them otherwise. Keeping them in a shared module matches the pattern established by `test/helpers/state.ts`, `test/helpers/requests.ts`, `test/helpers/responses.ts`.

**Alternative considered:** Leave helpers inlined per test file (no shared module).
**Why rejected:** Integration test setup is more involved than reducer test setup (async, stdin writes, delays). Duplicating 30–40 lines of setup across 5 files creates the same drift risk we just eliminated in Phase 1.

### Decision 2: Place integration tests in `test/integration/`

**Choice:** New directory `test/integration/` for all integration test files. Move `test/edge-jump-integration.test.tsx` into it as `test/integration/edge-jump.test.tsx`.

**Rationale:**
- Clear Tier 2 vs Tier 3 separation at directory level.
- `vitest.config.ts` already uses `test/**/*.test.tsx` pattern, so no config changes.
- Renaming the existing file to drop the `-integration` suffix is logical once the directory structure makes the distinction clear.

**Alternative considered:** Keep integration tests colocated with their unit test counterparts using `*.integration.test.tsx` suffix.
**Why rejected:** Colocation clutters `test/` and makes it harder to run only integration tests (useful in CI for staging). Directory separation is simpler.

### Decision 3: Additive first, delete after verification

**Choice:** Order the tasks so all integration tests are written and passing **before** any unit tests are deleted. Deletion is the last step before the final build/test run.

**Rationale:** If an integration test turns out NOT to cover what we thought, we'll discover that before losing the unit test. Safer rollback: if a new integration test fails, we simply don't delete its UT counterpart.

**Alternative considered:** Add+delete per-file (do toggles UT + integration, then reload UT + integration, etc.).
**Why rejected:** The `press(stdin, key)` pattern is async and flaky. If one integration test pattern turns out to be unreliable, we'd want to know BEFORE deleting unit tests across multiple files.

### Decision 4: What to keep vs delete (per-file verdict)

Based on the categorization:

| File | Tests | Delete (B) | Keep (A/C) | Rationale |
|------|-------|------------|------------|-----------|
| `wrap-toggle.test.ts` | 5 | 4 | 1 | Keep only the "preserves other state fields" invariants test (Category A). Delete 4 happy-path dispatch tests covered by `toggles.test.tsx`. |
| `reload.test.ts` | 7 | 4 | 3 | Keep: name-based selection preservation, reset-to-0 edge case, invariant preservation for CLEAR_RELOAD_MESSAGE. Delete simple dispatch tests. |
| `file-load.test.ts` | 13 | 8 | 5 | Keep: name-based reselection (2), name-not-found reset (1), invariant tests (2). Delete happy-path dispatch for each of 4 actions. |
| `edge-jump.test.ts` | 20 | 6–8 | 12–14 | Keep boundary math, maxOffset clamping, and all panel-specific branching tests. Delete tests that duplicate what `test/integration/edge-jump.test.tsx` (renamed from edge-jump-integration) already covers. Exact count determined during implementation. |

Total: approximately 22–25 tests deleted across 4 files, ~150–250 lines net reduction in UTs.

### Decision 5: Integration test coverage matrix

Five integration test files, one per logical keybinding group:

| File | Keybindings covered | Est. tests |
|------|---------------------|------------|
| `test/integration/toggles.test.tsx` | `v`, `w`, `r`, `d`, `?` | 6–8 |
| `test/integration/file-load.test.tsx` | `o`, text input, `Enter`, `Esc`, error states | 5–7 |
| `test/integration/reload.test.tsx` | `R` with file on disk | 2–3 |
| `test/integration/search.test.tsx` | `/`, text input, `Enter`, `Esc`, `n`, `N` | 6–8 |
| `test/integration/edge-jump.test.tsx` (renamed) | `g`, `G`, `0`, `$` (existing) | 6 |

Plus one catch-all:
| `test/integration/navigation.test.tsx` | `j`, `k`, arrows, `Tab` — panel focus cycling, selection movement | 4–6 |

Approximately 30–40 integration tests total, 500–800 new lines of integration tests, ~150 lines extracted to shared helper.

### Decision 6: Don't cover sending a request via integration

**Choice:** `Enter` → `sendSelectedRequest()` → `SEND_REQUEST` action dispatch is **out of scope** for integration tests in this change.

**Rationale:** Sending a request invokes `executeRequest` which uses undici. Mocking undici in an ink-testing-library context is possible but significantly increases test complexity. The existing `test/executor.test.ts` already covers the HTTP layer with mocked undici. An integration test for `Enter` would add flaky async behavior without materially strengthening coverage. Revisit separately if needed.

**Alternative considered:** Mock undici in a separate `test/integration/send.test.tsx`.
**Why rejected:** Scope creep; separate concern; defer to a future change if real-world bugs surface.

## Risks / Trade-offs

**Risk: ink-testing-library tests are slow and flaky** → The existing `edge-jump-integration.test.tsx` takes 1.2 seconds and uses `delay(50)` between keypresses. If we add ~30 integration tests, suite time may grow by 5–10 seconds. Mitigate by keeping `KEY_DELAY_MS` small and batching multiple keypresses in a single test.

**Risk: Deleted UTs leave unknown gaps** → If a deleted UT was actually testing something the integration test doesn't catch, we lose coverage silently. Mitigate with Decision 3 (add first, verify coverage, delete last). Run `npm test` after each deletion batch.

**Risk: Moving `edge-jump-integration.test.tsx` breaks git blame/history** → Git tracks moves well, but contributor muscle memory may lag. Mitigate by doing the move in one mechanical commit, separate from content changes.

**Risk: Integration tests lock in rendering details** → If we assert `lastFrame()` contains specific strings, UI tweaks may require test updates. Mitigate by asserting on semantic markers (focus indicators, panel titles, match counts) rather than exact pixel output.

**Risk: Async timing issues in CI** → Different CI hardware may need longer `KEY_DELAY_MS`. Mitigate by keeping delay configurable via env var if problems emerge; start with current 50ms.

## Migration Plan

1. Create `test/helpers/integration.ts` with extracted helpers.
2. Update existing `test/edge-jump-integration.test.tsx` to use the helper (verify still passes).
3. Create `test/integration/` directory and move existing test there as `edge-jump.test.tsx`.
4. Add new integration test files one at a time, running suite after each:
   - `toggles.test.tsx`
   - `navigation.test.tsx`
   - `file-load.test.tsx`
   - `reload.test.tsx`
   - `search.test.tsx`
5. Review each UT file and delete Category B tests (per Decision 4).
6. Run full `npm run build && npm test`; verify all passing.
7. Update `AGENTS.md` with new test structure notes.

**Rollback:** Each new integration test file and each UT deletion is independently revertible via git. If flakiness emerges in a specific integration file, skip the corresponding UT deletion.

## Open Questions

- Should integration tests use a different `KEY_DELAY_MS` (e.g., 20ms for faster suite)? Defer to implementation — try lower values; if flaky, raise back to 50ms.
- Should we add a separate `npm run test:integration` script? Not in this change — the current `npm test` runs everything. Can add later if CI needs staged test runs.