## 1. Types

- [ ] 1.1 Add `mode: 'normal' | 'fileLoad'` field to `AppState` interface in `src/core/types.ts`, initial value `'normal'`
- [ ] 1.2 Add `fileLoadInput: string` field to `AppState`, initial value `''`
- [ ] 1.3 Add `ENTER_FILE_LOAD` action type to `Action` union (no payload)
- [ ] 1.4 Add `UPDATE_FILE_LOAD_INPUT` action type with payload `{ value: string }`
- [ ] 1.5 Add `LOAD_FILE` action type with payload `{ requests: ParsedRequest[]; variables: FileVariable[]; filePath: string }`
- [ ] 1.6 Add `CANCEL_FILE_LOAD` action type (no payload) — resets `mode` to `'normal'` and clears `fileLoadInput`

## 2. Reducer

- [ ] 2.1 Add `ENTER_FILE_LOAD` case: set `mode` to `'fileLoad'`, set `fileLoadInput` to `''`
- [ ] 2.2 Add `UPDATE_FILE_LOAD_INPUT` case: set `fileLoadInput` to `action.value`
- [ ] 2.3 Add `LOAD_FILE` case: replace `requests`, `variables`, `filePath`; preserve selection by name (reset to 0 if name not found); clear `response`, `error`, reset scroll offsets; set `mode` to `'normal'`, clear `fileLoadInput`; set `reloadMessage` to `"Loaded: {basename}"`
- [ ] 2.4 Add `CANCEL_FILE_LOAD` case: set `mode` to `'normal'`, clear `fileLoadInput`

## 3. Input Handler

- [ ] 3.1 In `src/app.tsx` `useInput`, add `o` key handler for normal mode: dispatch `ENTER_FILE_LOAD`
- [ ] 3.2 Add file-load mode input handling: when `state.mode === 'fileLoad'`, route keystrokes to `UPDATE_FILE_LOAD_INPUT` actions (printable chars), Backspace (delete last char), Enter (submit), Escape (cancel)
- [ ] 3.3 Enter handler for file-load mode: resolve the path (use `path.resolve` for relative paths), check file existence with `existsSync`, read with `readFileSync`, parse with `parseHttpFile`. On success with requests found, dispatch `LOAD_FILE`. On error (file not found, empty parse result, read error), dispatch `REQUEST_ERROR`
- [ ] 3.4 After dispatching `LOAD_FILE`, schedule a `CLEAR_RELOAD_MESSAGE` action after 2000ms using `setTimeout` (reuse existing mechanism)

## 4. Components

- [ ] 4.1 Create `src/components/FileInput.tsx`: a component that renders a text input bar at the bottom of the screen with a prompt like `Open file: ` followed by the current input text and a cursor. Props: `value: string`. Style: full width, colored prompt text, white input text.
- [ ] 4.2 Update `src/components/StatusBar.tsx`: when `mode === 'fileLoad'`, render `FileInput` instead of the normal status bar content
- [ ] 4.3 Update `src/app.tsx` render: pass `mode` and `fileLoadInput` to `StatusBar`

## 5. Help Overlay

- [ ] 5.1 Add `o` → "Open a different file" entry to `SHORTCUTS` array in `HelpOverlay`
- [ ] 5.2 Add `Escape` → "Cancel file load" context note (only shown in file-load mode, optional enhancement)

## 6. Tests

- [ ] 6.1 Add reducer tests for `ENTER_FILE_LOAD`: mode set to `'fileLoad'`, input set to `''`
- [ ] 6.2 Add reducer test for `UPDATE_FILE_LOAD_INPUT`: input updates correctly
- [ ] 6.3 Add reducer tests for `LOAD_FILE`: state updates correctly (requests, variables, filePath replaced; selection preserved by name; mode back to `'normal'`; reloadMessage set with basename), selection reset to 0 when name not found
- [ ] 6.4 Add reducer test for `CANCEL_FILE_LOAD`: mode reset to `'normal'`, input cleared
- [ ] 6.5 Add reducer test: `LOAD_FILE` clears response, error, and scroll offsets

## 7. Documentation

- [ ] 7.1 Add `o` shortcut to keyboard shortcuts table in README with description "Open a different .http file"
- [ ] 7.2 Add brief usage note about loading files from within the TUI