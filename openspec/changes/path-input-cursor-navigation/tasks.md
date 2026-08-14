## 1. State and action types

- [ ] 1.1 Add `saveCursor: number` and `fileLoadCursor: number` to `AppState` in `src/core/types.ts`
- [ ] 1.2 Extend `UPDATE_SAVE_INPUT` and `UPDATE_FILE_LOAD_INPUT` actions with a `cursor: number` payload in `src/core/types.ts`
- [ ] 1.3 Add `MOVE_SAVE_CURSOR` and `MOVE_FILE_LOAD_CURSOR` actions (each `{ cursor: number }`) in `src/core/types.ts`
- [ ] 1.4 Initialize `saveCursor: 0` and `fileLoadCursor: 0` in `createInitialState` in `src/core/reducer.ts`

## 2. Reducer logic

- [ ] 2.1 In `ENTER_SAVE`, seed `saveCursor` to `defaultPath.length` (cursor at end of the pre-filled default path)
- [ ] 2.2 In `ENTER_FILE_LOAD`, seed `fileLoadCursor` to `0`
- [ ] 2.3 In `UPDATE_SAVE_INPUT`, store `value` and `cursor`, and clear `saveError` (unchanged error contract)
- [ ] 2.4 In `UPDATE_FILE_LOAD_INPUT`, store `value` and `cursor` (no error clearing, unchanged)
- [ ] 2.5 Add a `MOVE_SAVE_CURSOR` case that sets `saveCursor` only (does not clear `saveError`)
- [ ] 2.6 Add a `MOVE_FILE_LOAD_CURSOR` case that sets `fileLoadCursor` only
- [ ] 2.7 Reset the corresponding cursor to `0` in `SAVE_FILE`, `CANCEL_SAVE`, `LOAD_FILE`, and `CANCEL_FILE_LOAD`

## 3. Input handling

- [ ] 3.1 Import `insertText`, `deleteBackward`, `moveLeft`, `moveRight` from `./core/editor` in `src/app.tsx`
- [ ] 3.2 In the `saveLoad` branch: build a local `{ text, cursor }` buffer, handle `←`/`→` via `moveLeft`/`moveRight` dispatching `MOVE_SAVE_CURSOR`, `Backspace` via `deleteBackward` dispatching `UPDATE_SAVE_INPUT`, and printable input via `insertText` dispatching `UPDATE_SAVE_INPUT`
- [ ] 3.3 In the `fileLoad` branch: mirror 3.2 with `fileLoadInput`/`fileLoadCursor` and `MOVE_FILE_LOAD_CURSOR`/`UPDATE_FILE_LOAD_INPUT`

## 4. Overlay rendering

- [ ] 4.1 Add a `cursor: number` prop to `SaveOverlayProps` and render the value as three slices with an inverted cursor cell (`<Text inverse>{value[cursor] ?? ' '}</Text>`), replacing the hardcoded trailing `_`
- [ ] 4.2 Add a `cursor: number` prop to `FileLoadOverlayProps` with the same inverted cursor rendering
- [ ] 4.3 Pass `cursor={state.saveCursor}` / `cursor={state.fileLoadCursor}` into the overlays in `app.tsx`

## 5. Tests

- [ ] 5.1 Update `test/components/SaveOverlay.test.tsx` and `test/components/FileLoadOverlay.test.tsx` to pass `cursor`; add cases for inverted char mid-string and inverted trailing space at end
- [ ] 5.2 Update `test/core/save-operations.test.ts`: `UPDATE_SAVE_INPUT` gains `cursor`; `ENTER_SAVE` asserts `saveCursor` equals the default path length; add `MOVE_SAVE_CURSOR` cases including "does not clear `saveError`"
- [ ] 5.3 Update `test/core/file-load-operations.test.ts`: `UPDATE_FILE_LOAD_INPUT` gains `cursor`; `ENTER_FILE_LOAD` asserts `fileLoadCursor` is `0`; add `MOVE_FILE_LOAD_CURSOR` cases
- [ ] 5.4 Add integration coverage for `←`/`→` and cursor-aware insert/backspace in `test/integration/save-as-http.test.tsx` and `test/integration/file-load.test.tsx`

## 6. Verification

- [ ] 6.1 Run `npx tsc --noEmit` and `npx eslint` (or the repo's lint/typecheck scripts) and resolve new issues
- [ ] 6.2 Run the full test suite and confirm `save-as-http.test.tsx` passes unchanged
