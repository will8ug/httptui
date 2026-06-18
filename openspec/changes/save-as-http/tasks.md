## 1. HTTP Serializer (pure logic)

- [ ] 1.1 Create `src/core/http-serializer.ts` exporting `serializeHttpFile(requests: ParsedRequest[], variables: FileVariable[]): string`
- [ ] 1.2 Implement file-variable emission: `@name = value` lines at top, blank line before first request
- [ ] 1.3 Implement request emission: `### <name>` separator, `METHOD url` line, `Header: value` lines, blank line, body (if present)
- [ ] 1.4 Implement form-data omission: `# form-data body omitted (N text fields: keys...)` comment, strip `Content-Type: multipart/form-data` header
- [ ] 1.5 Ensure `{{var}}` placeholders in url/headers/body are preserved verbatim (no resolution)
- [ ] 1.6 Write unit tests in `test/core/http-serializer.test.ts`: single GET, POST with body, multiple requests, variables, form-data omission, placeholder preservation, empty inputs

## 2. Round-trip verification

- [ ] 2.1 Add round-trip tests: serialize → `parseHttpFile` → compare name/method/url/headers/body
- [ ] 2.2 Add round-trip test for file variables: serialize → parse → compare variables
- [ ] 2.3 Verify serializer output contains no `lineNumber` artifacts

## 3. Types and state model

- [ ] 3.1 Add `'saveLoad'` to `AppMode` union in `src/core/types.ts`
- [ ] 3.2 Add `saveInput: string` and `saveError: string | null` to `AppState`
- [ ] 3.3 Add action variants to `Action` union: `ENTER_SAVE`, `UPDATE_SAVE_INPUT`, `SAVE_FILE`, `SET_SAVE_ERROR`, `CANCEL_SAVE`
- [ ] 3.4 Initialize `saveInput: ''` and `saveError: null` in `createInitialState` in `src/core/reducer.ts`

## 4. Reducer handlers

- [ ] 4.1 Implement `ENTER_SAVE` case: set `mode` to `'saveLoad'`, compute default path from `state.filePath` (replace extension with `.http`), set `saveInput` to default, clear `saveError`
- [ ] 4.2 Implement `UPDATE_SAVE_INPUT` case: update `saveInput`, clear `saveError`
- [ ] 4.3 Implement `SET_SAVE_ERROR` case: set `saveError` to payload
- [ ] 4.4 Implement `CANCEL_SAVE` case: reset `mode` to `'normal'`, clear `saveInput` and `saveError`
- [ ] 4.5 Implement `SAVE_FILE` case: reset `mode` to `'normal'`, set `transientMessage` to payload, clear `saveInput` and `saveError`
- [ ] 4.6 Write reducer tests for each save action in `test/core/reducer.test.ts`

## 5. Shortcut registry

- [ ] 5.1 Add `S` entry to `SHORTCUTS` array in `src/core/shortcuts.ts` with `key: 'S'`, `label: ''`, `description: 'Save as .http file'`, `showInBar: false`, `showInHelp: true`, `group: 'request'`
- [ ] 5.2 Verify `S` does NOT appear in StatusBar output (showInBar: false)
- [ ] 5.3 Verify `S` DOES appear in HelpOverlay under the Request group

## 6. Save overlay component

- [ ] 6.1 Create `src/components/SaveOverlay.tsx` cloned from `FileLoadOverlay.tsx` pattern
- [ ] 6.2 Set title to "Save as .http", keep same border/input/error layout
- [ ] 6.3 Update hint text to "Press Enter to save, Esc to cancel"
- [ ] 6.4 Render `saveInput` value and `saveError` from props

## 7. App wiring (keybinding + side-effect)

- [ ] 7.1 Add `if (input === 'S')` branch in `useInput` normal-mode section of `src/app.tsx` dispatching `ENTER_SAVE`
- [ ] 7.2 Add save-mode input handling: typing chars dispatches `UPDATE_SAVE_INPUT`, `Enter` triggers save side-effect, `Escape` dispatches `CANCEL_SAVE`, `backspace` deletes last char
- [ ] 7.3 Implement save side-effect: resolve path (absolute vs relative to `path.dirname(state.filePath)`), check `existsSync`, auto-append ` - N` suffix on conflict, `writeFileSync`, dispatch `SAVE_FILE` with confirmation message on success or `SET_SAVE_ERROR` on failure
- [ ] 7.4 Add `SaveOverlay` to the overlay rendering switch in `src/app.tsx` (or `Layout.tsx`) for `mode === 'saveLoad'`

## 8. Integration tests

- [ ] 8.1 Test save flow end-to-end: load a Postman collection fixture, press `S`, confirm default path, write, verify file content matches serializer output
- [ ] 8.2 Test conflict suffix: pre-create target file, save, verify ` - 1` suffix applied
- [ ] 8.3 Test relative path resolution: enter relative path, verify file written to resolved absolute path
- [ ] 8.4 Test save error: enter unwritable path, verify error shown in overlay and overlay stays open
- [ ] 8.5 Test `S` key ignored in non-normal modes

## 9. Documentation

- [ ] 9.1 Add `S` row to the Keyboard Shortcuts table in `README.md` under the Request section
- [ ] 9.2 Add a brief "Saving as .http" section to README explaining the Postman→.http export workflow and the lossy form-data limitation
