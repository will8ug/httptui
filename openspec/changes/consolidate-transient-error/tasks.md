## 1. Core migration

- [x] 1.1 Migrate the five `RELOAD_ERROR` dispatch sites in `src/app.tsx` (editor-handoff stat failure, editor-handoff spawn failure, post-handoff re-read/parse failure, confirm-discard reload failure, `R`-key reload failure) to `dispatch({ type: 'SET_TRANSIENT_ERROR', error: toErrorInfo(error).message })`
- [x] 1.2 Delete the `RELOAD_ERROR` member from the `Action` union in `src/core/types.ts` and the `RELOAD_ERROR` case from `src/core/reducer.ts`; confirm the reducer compiles with no non-exhaustive warnings
- [x] 1.3 Switch the `copySelectedAsCurl` catch branch in `src/app.tsx` from `SET_TRANSIENT_MESSAGE` to `SET_TRANSIENT_ERROR`, keeping the message expression unchanged

## 2. Tests

- [x] 2.1 In the transient reducer tests (`test/core/transient-warning.test.ts`), add cases: `SET_TRANSIENT_ERROR` clears a showing `transientWarning`; and a structural case asserting `SET_TRANSIENT_ERROR` leaves `response`, `requestError`, search state, and `isLoading` untouched (absorbing the invariants from `reload-error.test.ts`)
- [x] 2.2 Delete `test/core/reload-error.test.ts`
- [x] 2.3 Update the copy-as-curl failure test to expect the error channel (red-bold transient error, no success message) instead of the success channel
- [x] 2.4 Run the full test suite and `openspec validate consolidate-transient-error --strict`

## 3. Documentation and specs

- [x] 3.1 Add a bullet to the "OpenSpec spec maintenance" section of `AGENTS.md`: spec scenarios state observable behavior (e.g. "WHEN a transient error is set"), never internal action names (e.g. "WHEN `RELOAD_ERROR` is dispatched"); action names are implementation details that leak into specs and rot when actions are renamed or consolidated — cite this change as precedent
- [x] 3.2 Verify no `RELOAD_ERROR` references remain outside `openspec/changes/` history (grep `src/`, `test/`, `openspec/specs/`)

## 4. Verification

- [x] 4.1 Confirm the status-bar delta scenarios are covered: transient error set while warning showing → warning cleared; transient error set while success showing → success cleared
- [x] 4.2 Build and lint clean (`npm run build`, lint) with no new diagnostics in changed files
