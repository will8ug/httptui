## 1. Core Filename Derivation

- [x] 1.1 Export an `isJsonBody(body: string): boolean` predicate from `src/core/formatter.ts` (try-parse, same detection `formatResponseBody` uses) and refactor `formatResponseBody` to use it; verify existing formatter-related tests still pass (`npx vitest run test/core/wrap-toggle.test.ts test/components/ResponseView.test.tsx`)
- [x] 1.2 Add `deriveResponseSaveFilename(requestName: string, body: string): string` to a new `src/core/response-save.ts` (slash → `-` sanitization, `.json` when `isJsonBody`, else `.txt`); verify with a new `test/core/response-save.test.ts` covering JSON body, non-JSON body, slash-sanitized Postman names, and raw-mode-independence of the extension rule

## 2. State: Mode, Actions, Reducer

- [x] 2.1 Add the `responseSave` value to `AppMode`, the `responseSaveInput`/`responseSaveCursor`/`responseSaveError` fields to `AppState` (initialized empty/null/0 in `createInitialState`), and the six actions (`ENTER_RESPONSE_SAVE`, `UPDATE_RESPONSE_SAVE_INPUT`, `MOVE_RESPONSE_SAVE_CURSOR`, `SET_RESPONSE_SAVE_ERROR`, `SAVE_RESPONSE_FILE`, `CANCEL_RESPONSE_SAVE`) to the `Action` union in `src/core/types.ts`; verify `npm run build` compiles with no errors
- [x] 2.2 Create `src/core/reducers/response-save.ts` mirroring `save-load.ts`: `ENTER_RESPONSE_SAVE` pre-fills via `deriveResponseSaveFilename(state.requests[state.selectedIndex].name, state.response.body)` with cursor at end; `SAVE_RESPONSE_FILE` returns to normal mode, clears the fields, sets the transient message, and does NOT touch `filePath` or `isDirty`; wire it into the root reducer's action routing; verify with reducer tests in `test/core/response-save.test.ts` (default pre-fill, success leaves `filePath` unchanged, cancel resets fields, error persists until input changes)

## 3. Overlay Reuse

- [x] 3.1 Add a `title` prop to `src/components/SaveOverlay.tsx`, pass `Save as .http` from the existing save-as call site, and verify `npx vitest run test/components/SaveOverlay.test.tsx test/integration/save-as-http.test.tsx` still pass with byte-identical save-as output
- [x] 3.2 Render `SaveOverlay` with title `Save response` when the app is in `responseSave` mode (value/cursor/error from the response-save state fields); verify with a component/integration check that the overlay shows the pre-filled filename and inline error text

## 4. Input Handling

- [x] 4.1 Add `handleResponseSaveInput` to `src/app/input-handlers.ts` mirroring `handleSaveInput`: `Escape` cancels, `Enter` validates non-empty, resolves relative paths against `dirname(state.filePath)`, refuses when the target exists (`SET_RESPONSE_SAVE_ERROR` naming the file), writes `state.response.body` verbatim via `writeFileSync(..., 'utf8')` and dispatches `SAVE_RESPONSE_FILE` with the basename on success, inline-errors write failures; line-editing keys mirror the save handler; verify with integration tests in a new `test/integration/save-response.test.tsx`
- [x] 4.2 Bind `s` in `handleNormalInput`: dispatch `ENTER_RESPONSE_SAVE` when `state.response` is non-null, otherwise `SET_TRANSIENT_MESSAGE` with a no-response message; verify integration tests cover: opens with a response, transient refusal without one, no trigger while another overlay is open, and `s` typed as text while the response-save overlay is open
- [x] 4.3 Route the `responseSave` mode to `handleResponseSaveInput` in `src/app/App.tsx`'s `useInput` dispatch chain; verify `npx vitest run test/integration/save-response.test.tsx` passes end-to-end (press `s`, edit path, Enter writes the raw body to a temp dir, transient message shown, status bar still shows the loaded file)

## 5. Registry and Docs

- [x] 5.1 Add the `s` entry (`key: 's'`, `label: ''`, `description: 'Save response to file'`, `showInBar: false`, `showInHelp: true`, `group: 'request'`) to `SHORTCUTS` in `src/core/shortcuts.ts`; verify `npx vitest run test/core/shortcuts.test.ts test/components/HelpOverlay.test.tsx test/components/StatusBar.test.tsx` pass and the help overlay shows the entry in the Request group while the status bar keeps its 6 items
- [x] 5.2 Add an `s` row (`Save response to file`) to the Request table in README.md's Keyboard Shortcuts section; verify by visual inspection that it sits alongside `S`/`y`

## 6. Final Verification

- [x] 6.1 Run the full suite (`npm test`) and `npm run build`; verify zero failures and no new lint/type errors, and confirm spec scenarios map to passing tests (conflict refusal, raw fidelity, no-rebind, mismatch case, extension rule)
