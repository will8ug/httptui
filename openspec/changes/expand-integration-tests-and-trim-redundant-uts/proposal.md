## Why

The reducer is now well-tested (Tier 2 unit tests), but the `useInput` dispatch layer in `src/app.tsx` is largely untested. Only `test/edge-jump-integration.test.tsx` exercises the real `<App>` component with real keystrokes, and it covers just 4 keybindings out of ~25. This means a refactor that breaks keyboard dispatch (e.g., changing a key binding, mis-wiring a guard condition, or breaking `useInput` ordering) can slip through with all unit tests green. Simultaneously, several unit tests now duplicate what a well-placed integration test would cover — they're "press W → check wrapMode" style tests that would be fully subsumed by a real keystroke integration test.

## What Changes

- **Add integration tests** using the existing `ink-testing-library` + `renderApp()` + `press(stdin, key)` pattern from `test/edge-jump-integration.test.tsx`. Cover the full dispatch surface: toggles, reload, file-load overlay, search, and remaining navigation keys.
- **Create a shared integration test helper** at `test/helpers/integration.ts` extracting `renderApp()`, `press()`, `delay()`, and `selectedLine()` — currently inlined in the existing edge-jump-integration test. The existing test will be updated to use the shared helper.
- **Delete redundant unit tests** — specifically those whose assertions are "dispatch action X, check state field Y" where the integration test already verifies the end-to-end keypress→render path. Targeted deletions across `wrap-toggle.test.ts`, `reload.test.ts`, `file-load.test.ts`, and `edge-jump.test.ts`. Keep unit tests that verify boundary math, exhaustive clamping logic, or edge cases that would be expensive to reproduce via integration tests.
- **Introduce a `test/integration/` directory** for the new integration test files. Existing `test/edge-jump-integration.test.tsx` MAY be moved there or left at the top level (deferred to the design).
- **No changes to production code** (`src/**`). No dependency changes.

## Capabilities

### New Capabilities
- `integration-tests`: New test suite covering end-to-end keystroke → dispatch → render flows for toggles, file-load overlay, reload, and search (top of the dispatch layer). Lives under `test/integration/`.

### Modified Capabilities
- `test-helpers`: Add `test/helpers/integration.ts` with `renderApp()`, `press()`, `delay()`, `selectedLine()`. Shared across all integration test files including the existing edge-jump integration test.
- `runtime`: Several reducer-centric unit tests in `test/wrap-toggle.test.ts`, `test/reload.test.ts`, `test/file-load.test.ts`, and `test/edge-jump.test.ts` SHALL be deleted because their assertions are now covered by integration tests. Remaining unit tests in these files continue to cover boundary math and exhaustive edge cases.

## Impact

- **New files**: `test/helpers/integration.ts`, `test/integration/toggles.test.tsx`, `test/integration/file-load.test.tsx`, `test/integration/reload.test.tsx`, `test/integration/search.test.tsx`. Approximately 600–900 added lines.
- **Modified files**: `test/edge-jump-integration.test.tsx` (use shared helper instead of inline `renderApp`/`press`), plus the four UT files above (tests deleted, not replaced).
- **Deleted tests**: Approximately 15–25 individual `it(...)` tests removed across 4 files. Net LoC reduction from deletions: ~150–250 lines.
- **Net effect**: Test suite grows modestly in LoC but significantly in coverage — the `useInput` dispatch layer goes from ~20% covered to ~80% covered.
- **No production code changes**. No `src/**` files touched.
- **Vitest config**: `test/integration/**/*.test.tsx` already matches the existing `include` pattern in `vitest.config.ts`, so no config changes needed.