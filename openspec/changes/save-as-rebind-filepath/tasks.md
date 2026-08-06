# Tasks: save-as-rebind-filepath

## 1. Core State Changes

- [x] 1.1 Extend the `SAVE_FILE` action type in `src/core/types.ts` (line 222) to carry the written path: `{ type: 'SAVE_FILE'; message: string; filePath: string }`
- [x] 1.2 In `src/app.tsx` (save-as Enter handler, line 340), pass the resolved `finalPath` in the `SAVE_FILE` dispatch: `dispatch({ type: 'SAVE_FILE', message: ..., filePath: finalPath })`
- [x] 1.3 In `src/core/reducer.ts` `SAVE_FILE` case (lines 472-481), set `filePath: action.filePath` alongside the existing `isDirty: false`, `mode: 'normal'`, and save-field resets

## 2. Tests

- [x] 2.1 Update the `SAVE_FILE` reducer unit tests in `test/core/save-operations.test.ts` (lines 97-139): add the required `filePath` payload to each dispatch, and add assertions that the reducer rebinds `filePath` to the action's path
- [x] 2.2 Add a reducer unit test covering the conflict-suffixed rebind: dispatching `SAVE_FILE` with `filePath: 'api - 1.http'` sets the state's `filePath` to `api - 1.http`
- [x] 2.3 Add an integration assertion in `test/integration/save-as-http.test.tsx`: after a successful save-as, the status bar shows the written file's name (e.g. `test-collection.http`), not the originally loaded name
- [x] 2.4 Review `test/integration/unsaved-changes.test.tsx` and `test/core/unsaved-changes.test.ts` for any save-related marker assertions and align them with the new semantics (a successful save clears the marker AND rebinds the current file)

## 3. Documentation

- [x] 3.1 Update the README feature blurb ("In-Session Body Editing ... export the result with (`S`)") and shortcut table entry so `S` is described as saving as and switching to the written file
- [x] 3.2 Update `docs/saving.md` to state that after a successful save the app switches to the saved file: the status bar shows its name and `R` reloads it

## 4. Verification

- [x] 4.1 Run `npm run typecheck` and `npm run lint` and confirm they pass
- [x] 4.2 Run `npm test` and confirm the full suite passes, including the new and updated assertions
