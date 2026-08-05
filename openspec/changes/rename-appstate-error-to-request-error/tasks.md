## 1. Rename the state field in source

- [ ] 1.1 Rename `error: ErrorInfo | null` → `requestError: ErrorInfo | null` in `AppState` (`src/core/types.ts:128`)
- [ ] 1.2 Update the 7 reducer write sites in `src/core/reducer.ts`: `SEND_REQUEST` (`:115`), `RECEIVE_RESPONSE` (`:125`), `REQUEST_ERROR` (`:135`, LHS only — `requestError: action.error`), `RELOAD_FILE` (`:365`), `LOAD_FILE` (`:424`), `SWITCH_ENV` (`:548`), `createInitialState` (`:791`)
- [ ] 1.3 Update the read site in `src/app.tsx:678`: `error={state.error}` → `error={state.requestError}`
- [ ] 1.4 Verify no `state.error` accesses remain in `src/` (grep `state\.error` — expect zero hits)

## 2. Update tests

- [ ] 2.1 `test/core/file-load-operations.test.ts`: rename state literals `error: null` (`:62`, `:235`) and assertions `expect(result.error)` (`:76`, `:250`) → `requestError`
- [ ] 2.2 `test/core/env-switcher.test.ts`: rename state literal `error: { message: 'old error' }` (`:331`) and assertion (`:347`) → `requestError`
- [ ] 2.3 `test/core/reload-error.test.ts`: rename assertion `expect(result.error).toBeNull()` (`:54`) → `requestError`
- [ ] 2.4 Verify look-alike `error` references are NOT touched: action payloads (`search.test.ts:300`, `reload-error.test.ts:11-61`), local var (`executor.test.ts:271`), `ResponseView` props (`ResponseView.test.tsx:15`, `src/components/ResponseView.tsx`)

## 3. Update spec

- [ ] 3.1 Apply the MODIFIED delta: `tui/spec.md` "File reload error display" requirement text "error state" → "request error state" (delta already written at `openspec/changes/rename-appstate-error-to-request-error/specs/tui/spec.md`)
- [ ] 3.2 Update the narrative prose in `tui/spec.md` File Reload section: "Reload clears `response`, `error`, and `responseScrollOffset`" → `` `requestError` `` (manual sync — outside delta mechanism)
- [ ] 3.3 Verify `response-view/spec.md` is untouched (its `error` references are the `ResponseView` prop, which is not renamed)

## 4. Verify

- [ ] 4.1 Run `npx tsc --noEmit` — zero type errors
- [ ] 4.2 Run `npm test` — all tests pass
- [ ] 4.3 Run `npm run lint` — zero errors
- [ ] 4.4 Run `openspec validate --change rename-appstate-error-to-request-error` — spec delta valid
