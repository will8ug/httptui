## 1. Types

- [x] 1.1 Add `mode: 'normal' | 'fileLoad'` field to `AppState` interface in `src/core/types.ts`, initial value `'normal'`
- [x] 1.2 Add `fileLoadInput: string` field to `AppState`, initial value `''`
- [x] 1.3 Add `fileLoadError: string | null` field to `AppState`, initial value `null`
- [x] 1.4 Add `ENTER_FILE_LOAD` action type to `Action` union (no payload)
- [x] 1.5 Add `UPDATE_FILE_LOAD_INPUT` action type with payload `{ value: string }`
- [x] 1.6 Add `SET_FILE_LOAD_ERROR` action type with payload `{ error: string }`
- [x] 1.7 Add `LOAD_FILE` action type with payload `{ requests: ParsedRequest[]; variables: FileVariable[]; filePath: string }`
- [x] 1.8 Add `CANCEL_FILE_LOAD` action type (no payload) — resets `mode` to `'normal'`, clears `fileLoadInput` and `fileLoadError`

## 2. Reducer

- [x] 2.1 Add `ENTER_FILE_LOAD` case: set `mode` to `'fileLoad'`, set `fileLoadInput` to `''`, set `fileLoadError` to `null`
- [x] 2.2 Add `UPDATE_FILE_LOAD_INPUT` case: set `fileLoadInput` to `action.value`
- [x] 2.3 Add `SET_FILE_LOAD_ERROR` case: set `fileLoadError` to `action.error`
- [x] 2.4 Add `LOAD_FILE` case: replace `requests`, `variables`, `filePath`; preserve selection by name (reset to 0 if name not found); clear `response`, `error`, reset scroll offsets; set `mode` to `'normal'`, clear `fileLoadInput` and `fileLoadError`; set `reloadMessage` to `"Loaded: {basename}"`
- [x] 2.5 Add `CANCEL_FILE_LOAD` case: set `mode` to `'normal'`, clear `fileLoadInput` and `fileLoadError`

## 3. Input Handler

- [x] 3.1 In `src/app.tsx` `useInput`, add `o` key handler for normal mode: dispatch `ENTER_FILE_LOAD`
- [x] 3.2 Add file-load mode input handling: when `state.mode === 'fileLoad'`, route keystrokes to `UPDATE_FILE_LOAD_INPUT` actions (printable chars), Backspace (delete last char), Enter (submit), Escape (cancel/dispatch CANCEL_FILE_LOAD)
- [x] 3.3 Enter handler for file-load mode: resolve the path (use `path.resolve` for relative paths), check file existence with `existsSync`. If file not found: dispatch `SET_FILE_LOAD_ERROR` with `"File not found: {path}"`. If file exists: read with `readFileSync`, parse with `parseHttpFile`. If no requests: dispatch `SET_FILE_LOAD_ERROR` with `"No requests found in {path}"`. On success: dispatch `LOAD_FILE`. On read/parse error: dispatch `SET_FILE_LOAD_ERROR` with the error message. **Errors stay in the overlay — do NOT dispatch `REQUEST_ERROR`**
- [x] 3.4 After dispatching `LOAD_FILE`, schedule a `CLEAR_RELOAD_MESSAGE` action after 2000ms using `setTimeout` (reuse existing mechanism)

## 4. Components

- [x] 4.1 Create `src/components/FileLoadOverlay.tsx`: a centered pop-up overlay component (following `HelpOverlay` pattern) with a bordered box containing: title "Open File", text input line with prompt `File: ` followed by `value` and a blinking `_` cursor, optional error line in red when `error` is not null, hint line "Enter to load, Esc to cancel". Props: `value: string; error: string | null`
- [x] 4.2 Update `src/app.tsx` render: pass `fileLoadInput` and `fileLoadError` to `FileLoadOverlay`, show it as the overlay when `mode === 'fileLoad'` (replacing or alongside `HelpOverlay`)

## 5. Help Overlay

- [x] 5.1 Add `o` → "Open a different file" entry to `SHORTCUTS` array in `HelpOverlay`

## 6. Tests

- [x] 6.1 Add reducer tests for `ENTER_FILE_LOAD`: mode set to `'fileLoad'`, input set to `''`, error set to `null`
- [x] 6.2 Add reducer test for `UPDATE_FILE_LOAD_INPUT`: input updates correctly
- [x] 6.3 Add reducer test for `SET_FILE_LOAD_ERROR`: error updates correctly, mode stays `'fileLoad'`
- [x] 6.4 Add reducer tests for `LOAD_FILE`: state updates correctly (requests, variables, filePath replaced; selection preserved by name; mode back to `'normal'`; fileLoadInput and fileLoadError cleared; reloadMessage set with basename), selection reset to 0 when name not found
- [x] 6.5 Add reducer test for `CANCEL_FILE_LOAD`: mode reset to `'normal'`, input and error cleared
- [x] 6.6 Add reducer test: `LOAD_FILE` clears response, error, and scroll offsets

## 7. Documentation

- [x] 7.1 Add `o` shortcut to keyboard shortcuts table in README with description "Open a different .http file"
- [x] 7.2 Add brief usage note about loading files from within the TUI