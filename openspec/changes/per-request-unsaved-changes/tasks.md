# Tasks: per-request-unsaved-changes

## 1. Type groundwork

- [ ] 1.1 Add `isDirty: boolean` to the `ParsedRequest` interface in `src/core/types.ts` (required field; docstring notes it is a tombstone meaning "edited in-session since the last load, reload, or save").
- [ ] 1.2 Remove `isDirty: boolean` from the `AppState` interface in `src/core/types.ts`; add an exported helper `hasUnsavedChanges(requests: ParsedRequest[]): boolean` returning `requests.some(r => r.isDirty)` (place next to the other type helpers in the same file).

## 2. Parse sites mark requests clean

- [ ] 2.1 Set `isDirty: false` on every request object pushed in `src/core/parser.ts` (around line 142).
- [ ] 2.2 Set `isDirty: false` on every request object pushed in `src/core/postman-parser.ts` (around line 350).
- [ ] 2.3 Set `isDirty: false` on every request object pushed in `src/core/openapi-parser.ts` (around line 580).
- [ ] 2.4 Update the `createRequest` factory in `test/helpers/requests.ts` to default `isDirty: false`, and update `test/helpers/state.ts` (`createInitialState`) so the initial requests are clean.

## 3. Reducer changes

- [ ] 3.1 In `COMMIT_EDIT` (`src/core/reducer.ts` ~715-739): set the edited request's marker with tombstone semantics — `{ ...req, body: nextBody, isDirty: req.isDirty || changed }` — and remove the `isDirty: state.isDirty || changed` line from the returned state.
- [ ] 3.2 In `SAVE_FILE` (~472-482): replace `isDirty: false` with clearing every marker — `requests: state.requests.map(r => ({ ...r, isDirty: false }))` (the array is kept, so markers must be cleared explicitly).
- [ ] 3.3 In `RELOAD_FILE` (~352-374) and `LOAD_FILE` (~410-439): delete the explicit `isDirty: false` lines — markers are clean by construction because the array is replaced by a fresh parse.
- [ ] 3.4 In `createInitialState` (~778-827): delete the `isDirty: false` line; the derived flag needs no initial value.

## 4. App wiring

- [ ] 4.1 Replace the four `state.isDirty` reads in `src/app.tsx` (lines ~466, ~510, ~573, ~708) with `hasUnsavedChanges(state.requests)`; import the helper.
- [ ] 4.2 Confirm `StatusBar` is unchanged (it receives `isDirty` as a boolean prop from `app.tsx`).

## 5. Tests

- [ ] 5.1 Extend `test/core/request-editing.test.ts`: a committed body change marks only the selected request dirty; committing an unchanged buffer leaves the marker unset; cancelling leaves it unset; other requests stay clean.
- [ ] 5.2 Extend `test/core/unsaved-changes.test.ts`: the file-level flag is derived (set when any request is marked, unset when none); the revert edge case — edit then restore to the load-time body — keeps the request marked and the flag set; save clears all markers; reload/load leave all markers clean.
- [ ] 5.3 Extend `test/core/save-operations.test.ts` (if it asserts `isDirty` clearing) for the derived flag and per-request marker clearing on save.
- [ ] 5.4 Update `test/components/StatusBar.test.tsx` (and any other direct `state.isDirty` references in tests) to construct state through `hasUnsavedChanges` semantics.
- [ ] 5.5 Update `test/integration/unsaved-changes.test.tsx` and `test/integration/request-body-editing.test.tsx` if they reference `state.isDirty` directly; observable behavior (status-bar `*`, confirm-discard gates) must be unchanged.

## 6. Verification

- [ ] 6.1 Run `npx tsc --noEmit` — clean (this is the enforcement that every parse site and factory sets the required field).
- [ ] 6.2 Run `npm run lint` — clean.
- [ ] 6.3 Run `npm test` — all green, including the new tombstone/revert/derived-flag cases, with no regressions in `unsaved-changes`, `request-editing`, `save-operations`, or `save-as-http` suites.
