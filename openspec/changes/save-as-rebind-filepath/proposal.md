## Why

After a save-as (`S`) that writes to a different file path, the status bar shows the original loaded file name with no `*` marker — but the loaded file on disk was never updated. The in-memory edits live only in the newly written file, and the UI gives no persistent indication of that. Root cause: `SAVE_FILE` clears `isDirty` but never rebinds `filePath` to the written path. The marker answers "is my work persisted somewhere?" while the displayed name answers "does memory match the loaded file?" — two different questions rendered as one consistent-looking status, which is a lie on the sync axis.

## What Changes

- On a successful save-as, the current file (`state.filePath`) becomes the **actual written path**, including any conflict-suffix (` - N`) the no-overwrite rule applied.
- The status bar shows the written file's name after a save, with no `*` marker (the edits are now persisted in the file the app tracks).
- Subsequent `S` default paths derive from the rebound file; `R` reloads the rebound file.
- The no-overwrite conflict-suffix rule is **unchanged**. In-place saving of the loaded file is intentionally out of scope — it will be a separate change with its own shortcut.
- Docs updated: the README "export the result" wording and `docs/saving.md` now describe save-as as switching the current file to the written path.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `save-as-http`: gains a requirement that a successful save rebinds the current file path to the actual written path.
- `unsaved-changes`: the "Successful save clears the unsaved-changes flag" requirement is rewritten — a save now clears the flag *by rebinding* the current file, removing the obsolete "clears even when the written path differs from the loaded file path" rationale.

## Impact

- **Code**: `src/core/types.ts` (`SAVE_FILE` action gains a `filePath` payload), `src/app.tsx` (passes the resolved `finalPath` at dispatch), `src/core/reducer.ts` (`SAVE_FILE` case sets `filePath`).
- **Behavior**: status-bar file identity, `ENTER_SAVE` default path derivation, and the `R` reload target all follow the rebound path.
- **Tests**: reducer unit tests for the rebind; `test/integration/save-as-http.test.tsx` gains an assertion that the status bar shows the new file name after a save-as.
- **Docs**: `README.md` feature blurb, `docs/saving.md`.
