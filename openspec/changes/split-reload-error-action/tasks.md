## 1. Type and interface changes

- [ ] 1.1 Rename `RequestError` interface to `ErrorInfo` in `src/core/types.ts` (interface body unchanged: `{ message: string; code?: string }`)
- [ ] 1.2 Add `RELOAD_ERROR` action to the `Action` union in `src/core/types.ts`: `| { type: 'RELOAD_ERROR'; error: ErrorInfo }`

## 2. Executor changes

- [ ] 2.1 Rename `toRequestError` to `toErrorInfo` in `src/core/executor.ts` and export it (currently not exported)
- [ ] 2.2 Rename `isRequestError` to `isErrorInfo` in `src/core/executor.ts`; update its signature to use `ErrorInfo`
- [ ] 2.3 Update `executeRequest` return type to `Promise<ResponseData | ErrorInfo>`
- [ ] 2.4 Update internal `toRequestError` call sites in executor.ts (lines 103, 180) to `toErrorInfo`

## 3. Reducer changes

- [ ] 3.1 Add `case 'RELOAD_ERROR':` to `src/core/reducer.ts` with the same body as `REQUEST_ERROR` case (response: null, error: action.error, isLoading: false, responseScrollOffset: 0, ...CLEAR_SEARCH_STATE)
- [ ] 3.2 Update `REQUEST_ERROR` case payload type reference from `RequestError` to `ErrorInfo` (if the reducer references the type name)

## 4. App component changes

- [ ] 4.1 Delete the duplicate `toRequestError` function in `src/app.tsx` (lines 63-74)
- [ ] 4.2 Import `toErrorInfo` (and `isErrorInfo`) from `./core/executor` in `src/app.tsx`
- [ ] 4.3 Update line 136 dispatch to use `isErrorInfo` (was `isRequestError`)
- [ ] 4.4 Update line 142: `REQUEST_ERROR` dispatch with `toErrorInfo(error)` (was `toRequestError`)
- [ ] 4.5 Update line 435: change `REQUEST_ERROR` to `RELOAD_ERROR`, use `toErrorInfo(error)`
- [ ] 4.6 Update line 588: change `REQUEST_ERROR` to `RELOAD_ERROR`, use `toErrorInfo(error)`
- [ ] 4.7 Update line 199 (`SET_FILE_LOAD_ERROR`): use `toErrorInfo(error).message` (was `toRequestError`)
- [ ] 4.8 Update line 341 (`SET_SAVE_ERROR`): use `toErrorInfo(error).message` (was `toRequestError`)

## 5. Component changes

- [ ] 5.1 Update `src/components/ResponseView.tsx` type import: `RequestError` → `ErrorInfo` (line 7)
- [ ] 5.2 Update `ResponseViewProps.error` type from `RequestError | null` to `ErrorInfo | null` (line 15)

## 6. Test updates

- [ ] 6.1 Update `test/core/search.test.ts`: add or update test for `RELOAD_ERROR` clearing search state (mirror the existing `REQUEST_ERROR` test at line 297)
- [ ] 6.2 Update `test/core/executor.test.ts`: rename `isRequestError` references to `isErrorInfo`
- [ ] 6.3 Grep all test files for `RequestError`, `toRequestError`, `isRequestError` and update to `ErrorInfo`, `toErrorInfo`, `isErrorInfo`

## 7. Spec prose update

- [ ] 7.1 Update `openspec/specs/tui/spec.md` line 81: change `REQUEST_ERROR` to `RELOAD_ERROR` in the File Reload prose section

## 8. Verification

- [ ] 8.1 Run `lsp_diagnostics` on all changed files — no new errors
- [ ] 8.2 Run build (`npm run build` or `tsc --noEmit`) — exit code 0
- [ ] 8.3 Run test suite — all tests pass (or only pre-existing failures noted)
