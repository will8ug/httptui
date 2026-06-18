## 1. HTTP Serializer (pure logic)

- [x] 1.1 Create `src/core/http-serializer.ts` exporting `serializeHttpFile(requests: ParsedRequest[], variables: FileVariable[]): string`
- [x] 1.2 Implement file-variable emission: `@name = value` lines at top, blank line before first request
- [x] 1.3 Implement request emission: `### <name>` separator, `METHOD url` line, `Header: value` lines, blank line, body (if present)
- [x] 1.4 Implement form-data omission: `# form-data body omitted (N text fields: keys...)` comment, strip `Content-Type: multipart/form-data` header
- [x] 1.5 Ensure `{{var}}` placeholders in url/headers/body are preserved verbatim (no resolution)
- [x] 1.6 Write unit tests in `test/core/http-serializer.test.ts`: single GET, POST with body, multiple requests, variables, form-data omission, placeholder preservation, empty inputs

## 2. Round-trip verification

- [x] 2.1 Add round-trip tests: serialize → `parseHttpFile` → compare name/method/url/headers/body
- [x] 2.2 Add round-trip test for file variables: serialize → parse → compare variables
- [x] 2.3 Verify serializer output contains no `lineNumber` artifacts

## 3. Types and state model

- [x] 3.1 Add `'saveLoad'` to `AppMode` union in `src/core/types.ts`
- [x] 3.2 Add `saveInput: string` and `saveError: string | null` to `AppState`
- [x] 3.3 Add action variants to `Action` union: `ENTER_SAVE`, `UPDATE_SAVE_INPUT`, `SAVE_FILE`, `SET_SAVE_ERROR`, `CANCEL_SAVE`
- [x] 3.4 Initialize `saveInput: ''` and `saveError: null` in `createInitialState` in `src/core/reducer.ts`

## 4. Reducer handlers

- [x] 4.1 Implement `ENTER_SAVE` case: set `mode` to `'saveLoad'`, compute default path from `state.filePath` (replace extension with `.http`), set `saveInput` to default, clear `saveError`
- [x] 4.2 Implement `UPDATE_SAVE_INPUT` case: update `saveInput`, clear `saveError`
- [x] 4.3 Implement `SET_SAVE_ERROR` case: set `saveError` to payload
- [x] 4.4 Implement `CANCEL_SAVE` case: reset `mode` to `'normal'`, clear `saveInput` and `saveError`
- [x] 4.5 Implement `SAVE_FILE` case: reset `mode` to `'normal'`, set `transientMessage` to payload, clear `saveInput` and `saveError`
- [x] 4.6 Write reducer tests for each save action in `test/core/save-operations.test.ts`

## 5. Shortcut registry

- [x] 5.1 Add `S` entry to `SHORTCUTS` array in `src/core/shortcuts.ts` with `key: 'S'`, `label: ''`, `description: 'Save as .http file'`, `showInBar: false`, `showInHelp: true`, `group: 'request'`
- [x] 5.2 Verify `S` does NOT appear in StatusBar output (showInBar: false)
- [x] 5.3 Verify `S` DOES appear in HelpOverlay under the Request group

## 6. Save overlay component

- [x] 6.1 Create `src/components/SaveOverlay.tsx` cloned from `FileLoadOverlay.tsx` pattern
- [x] 6.2 Set title to "Save as .http", keep same border/input/error layout
- [x] 6.3 Update hint text to "Press Enter to save, Esc to cancel"
- [x] 6.4 Render `saveInput` value and `saveError` from props

## 7. App wiring (keybinding + side-effect)

- [x] 7.1 Add `if (input === 'S')` branch in `useInput` normal-mode section of `src/app.tsx` dispatching `ENTER_SAVE`
- [x] 7.2 Add save-mode input handling: typing chars dispatches `UPDATE_SAVE_INPUT`, `Enter` triggers save side-effect, `Escape` dispatches `CANCEL_SAVE`, `backspace` deletes last char
- [x] 7.3 Implement save side-effect: resolve path (absolute vs relative to `path.dirname(state.filePath)`), check `existsSync`, auto-append ` - N` suffix on conflict, `writeFileSync`, dispatch `SAVE_FILE` with confirmation message on success or `SET_SAVE_ERROR` on failure
- [x] 7.4 Add `SaveOverlay` to the overlay rendering switch in `src/app.tsx` for `mode === 'saveLoad'`

## 8. Integration tests

- [x] 8.1 Test save flow end-to-end: press `S`, confirm default path, write, verify file content matches serializer output
- [x] 8.2 Test conflict suffix: pre-create target file, save, verify ` - 1` suffix applied
- [x] 8.3 Test relative path resolution: enter relative path, verify file written to resolved absolute path
- [x] 8.4 Test save error: enter unwritable path, verify error shown in overlay and overlay stays open
- [x] 8.5 Test `S` key ignored in non-normal modes

## 9. Documentation

- [x] 9.1 Add `S` row to the Keyboard Shortcuts table in `README.md` under the Request section
- [x] 9.2 Add a brief "Saving as .http" section to README explaining the Postman→.http export workflow and the lossy form-data limitation
