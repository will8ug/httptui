## 1. Type and interface changes

- [x] 1.1 Rename `RequestError` interface to `ErrorInfo` in `src/core/types.ts` (interface body unchanged: `{ message: string; code?: string }`)
- [x] 1.2 Add `RELOAD_ERROR` action to the `Action` union in `src/core/types.ts`: `| { type: 'RELOAD_ERROR'; error: ErrorInfo }`
- [x] 1.3 Add `transientError: string | null` to the app `State` type in `src/core/types.ts` (initial value: `null`)

## 2. Executor changes

- [x] 2.1 Rename `toRequestError` to `toErrorInfo` in `src/core/executor.ts` and export it (currently not exported)
- [x] 2.2 Rename `isRequestError` to `isErrorInfo` in `src/core/executor.ts`; update its signature to use `ErrorInfo`
- [x] 2.3 Update `executeRequest` return type to `Promise<ResponseData | ErrorInfo>`
- [x] 2.4 Update internal `toRequestError` call sites in executor.ts (lines 103, 180) to `toErrorInfo`

## 3. Reducer changes

- [x] 3.1 Add `case 'RELOAD_ERROR':` to `src/core/reducer.ts` with body: `{ ...state, transientMessage: null, transientError: action.error.message }` — does NOT touch response, error, isLoading, scrollOffset, or search state
- [x] 3.2 Update `SET_TRANSIENT_MESSAGE` case in reducer to also clear `transientError`: add `transientError: null` to the returned state
- [x] 3.3 Update `REQUEST_ERROR` case payload type reference from `RequestError` to `ErrorInfo` (if the reducer references the type name)

## 4. App component changes

- [x] 4.1 Delete the duplicate `toRequestError` function in `src/app.tsx` (lines 63-74)
- [x] 4.2 Import `toErrorInfo` (and `isErrorInfo`) from `./core/executor` in `src/app.tsx`
- [x] 4.3 Update line 136 dispatch to use `isErrorInfo` (was `isRequestError`)
- [x] 4.4 Update line 142: `REQUEST_ERROR` dispatch with `toErrorInfo(error)` (was `toRequestError`)
- [x] 4.5 Update line 435: change `REQUEST_ERROR` to `RELOAD_ERROR`, use `toErrorInfo(error)`, and add `scheduleTransientClear()` call after dispatch
- [x] 4.6 Update line 588: change `REQUEST_ERROR` to `RELOAD_ERROR`, use `toErrorInfo(error)`, and add `scheduleTransientClear()` call after dispatch
- [x] 4.7 Update line 199 (`SET_FILE_LOAD_ERROR`): use `toErrorInfo(error).message` (was `toRequestError`)
- [x] 4.8 Update line 341 (`SET_SAVE_ERROR`): use `toErrorInfo(error).message` (was `toRequestError`)
- [x] 4.9 Pass `transientError={state.transientError}` prop to `StatusBar` in the render section (around line 697 where `transientMessage` is passed)

## 5. Component changes

- [x] 5.1 Update `src/components/ResponseView.tsx` type import: `RequestError` → `ErrorInfo` (line 7)
- [x] 5.2 Update `ResponseViewProps.error` type from `RequestError | null` to `ErrorInfo | null` (line 15)
- [x] 5.3 Add `transientError: string | null` to `StatusBarProps` in `src/components/StatusBar.tsx`
- [x] 5.4 Add `transientError` to StatusBar function params
- [x] 5.5 Add red bold render for `transientError` in StatusBar (next to the existing green `transientMessage` render, line 94): `{transientError ? <Text key="error-message" color="red" bold>{transientError}  </Text> : null}`
- [x] 5.6 Update `reloadLabelWidth` calculation in StatusBar to account for `transientError` length (the existing calculation uses `transientMessage` length — add the same for `transientError`)

## 6. Test updates

- [x] 6.1 Update `test/core/executor.test.ts`: rename `isRequestError` references to `isErrorInfo`
- [x] 6.2 Add reducer test for `RELOAD_ERROR`: verify it sets `transientError`, clears `transientMessage`, and does NOT change `response`, `error`, `searchMatches`, `lastSearchQuery`, `isLoading`
- [x] 6.3 Add reducer test: `SET_TRANSIENT_MESSAGE` with `null` clears both `transientMessage` and `transientError`
- [x] 6.4 Add StatusBar test: renders `transientError` in red when set; hides it when null
- [x] 6.5 Grep all test files for `RequestError`, `toRequestError`, `isRequestError` and update to `ErrorInfo`, `toErrorInfo`, `isErrorInfo`
- [x] 6.6 Update `test/core/search.test.ts` line 297: the existing `REQUEST_ERROR` clears search test stays unchanged (REQUEST_ERROR still clears search). Do NOT add a RELOAD_ERROR search-clearing test (it does not clear search).

## 7. Spec prose update

- [x] 7.1 Update `openspec/specs/tui/spec.md` line 81: change `REQUEST_ERROR` to `RELOAD_ERROR` and update the description to mention transient status-bar message instead of response-panel error

## 8. Verification

- [x] 8.1 Run `lsp_diagnostics` on all changed files — no new errors
- [x] 8.2 Run build (`npm run build` or `tsc --noEmit`) — exit code 0
- [x] 8.3 Run test suite — all tests pass (or only pre-existing failures noted)
