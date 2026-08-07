## Why

The save-as conflict rule silently renames the user's target when it exists: the system appends ` - N` to the basename and writes to the first free sibling without telling the user. Combined with the save-as rebind (the app switches its current file to the written path), repeated default-saves on a `.http` file accumulate stacked suffixes (`api - 1.http`, `api - 1 - 1.http`, ...) — names the user never typed, tracked as the current file. The user's intent is obscured by the tool. Vim's `:saveas` solves this by refusing: `E13: File exists (add ! to override)`, no write, no rename, buffer unchanged. We prefer that honesty over silent auto-renaming.

## What Changes

- **BREAKING** — Delete the auto-suffix conflict mechanism. When the resolved target path already exists, the save SHALL be refused: the save overlay displays an error, the overlay stays open, no file is written, and the current file path and unsaved-changes flag are unchanged.
- When the resolved target path does not exist, save proceeds exactly as today: write, rebind the current file to the written path, clear the unsaved-changes flag, show the transient "Saved N requests to <path>" message.
- The error SHALL be cleared when the user modifies the save input (reusing the existing `SET_SAVE_ERROR` mechanism and its clear-on-input behavior).
- Docs updated: `docs/saving.md` no longer describes suffix auto-appending; it states that a conflicting file causes the save to be refused with the overlay staying open.
- No override (`!`-style force) is added in this change; the planned in-place-save feature is the intended path for "save to the current file" going forward.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `save-as-http`: the "File-name conflict auto-suffix" requirement is replaced by a "File-name conflict refusal" requirement; the rebind and transient-message requirements drop their conflict-suffix scenarios.
- `unsaved-changes`: the save-clears-flag requirement loses the auto-increment rationale and its conflict-suffix scenario; a refused save leaves the flag set (covered by the existing failed-save scenario).

## Impact

- **Code**: `src/app.tsx` — the save overlay Enter handler drops the `existsSync` suffix loop (`:325-336`); a plain existence check dispatches `SET_SAVE_ERROR` instead. No reducer or action-type changes: `SAVE_FILE` rebind behavior and the `SET_SAVE_ERROR` path are reused as-is.
- **Behavior**: saving to an existing path becomes an error instead of a silent sibling-file write.
- **Tests**: `test/integration/save-as-http.test.tsx` — the "Conflict suffix auto-appended" test and the staged "Save a second time increase the number of N" test are replaced with refusal tests; the "Status bar shows written file name after save-as" test is unchanged (rebind retained). `test/core/save-operations.test.ts` reducer test wording updated (behavior unchanged).
- **Docs**: `docs/saving.md`.
- **Specs**: `save-as-http`, `unsaved-changes` (delta specs below).
