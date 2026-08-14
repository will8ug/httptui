## Why

The save-as (`S`) and file-load (`o`) overlays are single-line path inputs with a hardcoded trailing cursor: `←`/`→` are silently ignored, and the only way to fix a mid-path typo is to backspace the entire path and retype it. The request editor already solves this for its URL tab; the two path inputs should get the same single-line cursor behavior.

## What Changes

- The save overlay path input and the file-load overlay path input each gain a movable cursor:
  - `←` / `→` move the cursor one character (clamped to the input bounds).
  - Typing inserts characters at the cursor instead of appending to the end.
  - `Backspace` deletes the character before the cursor instead of always the last character.
  - `Delete` deletes the character after the cursor.
  - `Home` / `Ctrl+A` moves the cursor to the start of the input; `End` / `Ctrl+E` moves it to the end.
  - The cursor is rendered by inverting the cell at the cursor position (an inverted trailing space when the cursor is at the end), matching the editor overlay.
- Cursor movement (`←` / `→` / `Home` / `End`) does **not** clear the save error; only text edits (insert/backspace/delete) clear it, preserving the existing "error clears on input modification" contract.
- `AppState` gains two cursor fields (`saveCursor`, `fileLoadCursor`); the existing input actions gain a cursor payload, and two cursor-move actions are added.
- Search mode and all other overlays are unchanged.

## Capabilities

### New Capabilities
- `file-load`: the open-file overlay (`o`) path input — entry, cancel, load, error handling, and single-line cursor navigation.

### Modified Capabilities
- `save-as-http`: the save overlay path input gains single-line cursor navigation (left/right/home/end movement, insert-at-cursor, backspace/delete, inverted cursor rendering, error-clearing rules).

## Impact

- `src/core/types.ts` — `AppState` (`saveCursor`, `fileLoadCursor`) and `Action` (`UPDATE_SAVE_INPUT`, `UPDATE_FILE_LOAD_INPUT` cursor payloads; `MOVE_SAVE_CURSOR`, `MOVE_FILE_LOAD_CURSOR`).
- `src/core/reducer.ts` — seed/reset cursor on enter/exit; store cursor in input actions; add cursor-move actions.
- `src/app.tsx` — `saveLoad` and `fileLoad` `useInput` branches delegate to `src/core/editor.ts` helpers.
- `src/components/SaveOverlay.tsx`, `src/components/FileLoadOverlay.tsx` — add a `cursor` prop and render an inverted cursor cell.
- Tests: `SaveOverlay.test.tsx`, `FileLoadOverlay.test.tsx`, `save-operations.test.ts`, `file-load-operations.test.ts`; `save-as-http.test.tsx` integration should pass unchanged.
