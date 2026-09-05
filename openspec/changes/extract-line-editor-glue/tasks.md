## 1. Extract the shared helper

- [x] 1.1 Add a module-private `applyLineEdit(buffer, input, key, moveCursor, updateInput): boolean` helper to `src/app/input-handlers.ts` that encapsulates the 7-key chain shared by the single-line input handlers — home/`Ctrl+A` → `moveLineStart`, end/`Ctrl+E` → `moveLineEnd`, backspace → `deleteBackward`, delete → `deleteForward`, left/right arrows → `moveLeft`/`moveRight`, printable insert → `insertText` — dispatching cursor moves through `moveCursor` and text changes through `updateInput`, returning `true` when it handled the key and `false` otherwise. Verify `npm run typecheck` passes.

## 2. Replace the three duplicated blocks

- [x] 2.1 Replace the line-editing block in `handleFileLoadInput` with a call to `applyLineEdit` (buffer from `fileLoadInput`/`fileLoadCursor`, callbacks dispatching `MOVE_FILE_LOAD_CURSOR` and `UPDATE_FILE_LOAD_INPUT`); verify `npx vitest run test/integration/file-load.test.tsx` still passes unchanged
- [x] 2.2 Replace the line-editing block in `handleSaveInput` with a call to `applyLineEdit` (buffer from `saveInput`/`saveCursor`, callbacks dispatching `MOVE_SAVE_CURSOR` and `UPDATE_SAVE_INPUT`); verify `npx vitest run test/integration/save-as-http.test.tsx` still passes unchanged
- [x] 2.3 Replace the line-editing block in `handleResponseSaveInput` with a call to `applyLineEdit` (buffer from `responseSaveInput`/`responseSaveCursor`, callbacks dispatching `MOVE_RESPONSE_SAVE_CURSOR` and `UPDATE_RESPONSE_SAVE_INPUT`); verify `npx vitest run test/integration/save-response.test.tsx` still passes unchanged

## 3. Final verification

- [x] 3.1 Run the full suite (`npm test`), `npm run typecheck`, `npm run lint`, and `npm run build`; verify zero failures and confirm the diff is confined to `src/app/input-handlers.ts` with no change to action types, reducers, state shape, or any test file
