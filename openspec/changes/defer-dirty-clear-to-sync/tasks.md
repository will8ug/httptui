## 1. Reducer

- [x] 1.1 In `src/core/reducer.ts`, remove `isDirty: false,` from the `CONFIRM_DISCARD` case. The case keeps `mode: 'normal'` and `pendingDiscardAction: null`. `RELOAD_FILE`, `LOAD_FILE`, and `SAVE_FILE` already clear the flag and are unchanged.

## 2. Unit tests

- [x] 2.1 In `test/core/unsaved-changes.test.ts`, flip the `is cleared by CONFIRM_DISCARD` test (around line 83): assert `result.isDirty` is `true` (preserved), while `result.mode` is `'normal'` and `result.pendingDiscardAction` is `null` (those still hold). Rename the test to reflect preservation, e.g. `is preserved by CONFIRM_DISCARD`.
- [x] 2.2 Verify the `pendingDiscardAction` describe block's `is cleared by CONFIRM_DISCARD` test (around line 140) still passes unchanged — it asserts `pendingDiscardAction` is null and `mode` is normal, neither of which this change affects.

## 3. Integration tests

- [x] 3.1 In `test/integration/unsaved-changes.test.tsx`, add a test for the reported bug flow: commit a body edit (`e` → type → `Ctrl+S`) so the `*` marker shows; press `o` to trigger the confirm-discard prompt; press `y` to confirm and enter the file-load overlay; press `Escape` to cancel the file load. Assert the status bar still shows the `*` prefix and the unsaved-changes flag remains set.
- [x] 3.2 Add a test for the reload-failure path: with the flag set, press `R`, confirm with `y`, and arrange for the reload to fail (e.g. the current file is unreadable or unparseable). Assert the `*` marker persists. If a reliable failure fixture is impractical at the integration level, cover this at the unit level by asserting `REQUEST_ERROR` does not clear `isDirty`.

## 4. Verification

- [x] 4.1 Run `npm run lint` and `npm run typecheck` (or the project's equivalent) and confirm no new errors on changed files.
- [x] 4.2 Run `npm test` and confirm the unsaved-changes unit and integration suites pass, including the new and flipped assertions.
- [x] 4.3 Manually reproduce the reported flow in the running TUI: edit → `Ctrl+S` (`*` shows) → `o` → `y` → `Esc` → confirm `*` is still shown.
