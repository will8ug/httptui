## 1. Types

- [x] 1.1 Add `RELOAD_FILE` action type to `Action` union in `src/core/types.ts` with payload: `{ requests: ParsedRequest[]; variables: FileVariable[] }`
- [x] 1.2 Add `CLEAR_RELOAD_MESSAGE` action type to `Action` union (no payload)
- [x] 1.3 Add `reloadMessage: string | null` field to `AppState` interface, initial value `null`

## 2. Reducer

- [x] 2.1 Add `RELOAD_FILE` case to reducer in `src/app.tsx`: replace `requests` and `variables`, preserve selection by name (match on old request name, reset to 0 if not found), clear `response`, `error`, reset `responseScrollOffset` to 0, set `reloadMessage` to `"Reloaded"`
- [x] 2.2 Add `CLEAR_RELOAD_MESSAGE` case to reducer: set `reloadMessage` to `null`

## 3. Input Handler

- [x] 3.1 Add `R` key handler in `useInput` in `src/app.tsx`: read file at `state.filePath` with `readFileSync`, parse with `parseHttpFile`, dispatch `RELOAD_FILE`. On error, dispatch `REQUEST_ERROR` with the error message.
- [x] 3.2 After dispatching `RELOAD_FILE`, schedule a `CLEAR_RELOAD_MESSAGE` dispatch after 2000ms using `setTimeout`

## 4. Status Bar

- [x] 4.1 Pass `reloadMessage` prop from `App` to `StatusBar`
- [x] 4.2 Display "Reloaded" message in `StatusBar` when `reloadMessage` is not null (green color, right side next to file info)

## 5. Help Overlay

- [x] 5.1 Add `R` → "Reload file" entry to `HelpOverlay` component

## 6. Tests

- [x] 6.1 Add reducer tests for `RELOAD_FILE` action: selection preserved by name, selection reset to 0 when name missing, response and error cleared, reloadMessage set
- [x] 6.2 Add reducer test for `CLEAR_RELOAD_MESSAGE`: reloadMessage set to null
- [x] 6.3 Add CLI smoke test for reload: start httptui with a valid file, verify it stays alive (already covered by existing smoke test, but verify no regressions)

## 7. Documentation

- [x] 7.1 Add `R` shortcut to keyboard shortcuts table in README