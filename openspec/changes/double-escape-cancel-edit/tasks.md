## 1. State and types

- [x] 1.1 Add `editEscapeArmedAt: number | null` to `AppState` in `src/core/types.ts`
- [x] 1.2 Add `{ type: 'ARM_EDIT_CANCEL'; now: number }` to the `Action` union in `src/core/types.ts`
- [x] 1.3 Initialize `editEscapeArmedAt: null` in `createInitialState` in `src/core/reducer.ts`
- [x] 1.4 Add `EDIT_CANCEL_WINDOW_MS = 2000` to `src/utils/timing.ts`

## 2. Reducer handling

- [x] 2.1 Add an `ARM_EDIT_CANCEL` case that sets `editEscapeArmedAt: action.now` and `transientMessage: 'Press Esc again to discard changes'` (clearing `transientError`)
- [x] 2.2 Reset `editEscapeArmedAt: null` in `CANCEL_EDIT`, and clear the stale hint by setting `transientMessage: null` (and `transientError: null`)
- [x] 2.3 Reset `editEscapeArmedAt: null` in `COMMIT_EDIT`

## 3. Input handling in app.tsx

- [x] 3.1 Add an `isEditorDirty` check in the `state.mode === 'edit'` branch of `src/app.tsx` comparing `editBuffers.url.text !== request.url`, `editBuffers.body.text !== (request.body ?? '')`, and `editBuffers.headers.text !== headersToText(request.headers)`
- [x] 3.2 Replace the unconditional `CANCEL_EDIT` dispatch on `key.escape` with the guard: no changes → `CANCEL_EDIT`; otherwise, if `editEscapeArmedAt` is set and `Date.now() - editEscapeArmedAt <= EDIT_CANCEL_WINDOW_MS` → `CANCEL_EDIT`, else → `ARM_EDIT_CANCEL` with `now: Date.now()`

## 4. Tests

- [x] 4.1 Update `test/integration/request-body-editing.test.tsx` — the "Escape discards the edit" scenario now presses `Esc` twice within the window
- [x] 4.2 Update `test/integration/request-headers-editing.test.tsx` — the malformed-header scenario now presses `Esc` twice to cancel
- [x] 4.3 Add tests covering: first `Esc` shows the hint and stays open; `Esc` with no changes closes immediately; `Esc` after the window re-arms (stays open)
- [x] 4.4 Run the full test suite and `npm run build` to confirm no regressions
