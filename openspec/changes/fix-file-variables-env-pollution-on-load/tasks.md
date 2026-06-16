## 1. Source fix

- [x] 1.1 In `src/app.tsx`, locate the `o` (file load) keypress handler and remove the pre-merge call. Replace `variables: mergedVariables` in the `LOAD_FILE` dispatch with `variables: parseResult.variables`. Delete the now-unused `mergedVariables` local. (Lines ~184-189.)
- [x] 1.2 In `src/app.tsx`, locate the `R` (reload) keypress handler and remove the pre-merge call. Inline `parseResult.variables` directly into the `RELOAD_FILE` dispatch. (Lines ~386-387.)

## 2. Unit tests — reducer contract

- [x] 2.1 In `test/core/file-load.test.ts`, add a new `describe('LOAD_FILE preserves pristine file variables for later (none) switch', ...)` block. Set up an initial state with `environmentVariables: [{name: 'baseUrl', value: 'from-env'}]` and an active env. Dispatch `LOAD_FILE` with `variables: [{name: 'baseUrl', value: 'from-file'}]`. Assert `result.fileVariables` deeply equals `[{name: 'baseUrl', value: 'from-file'}]` (no env contamination). Then dispatch `SWITCH_ENV` with `environmentVariables: []` and `envName: null`. Assert the resulting `variables` resolves `baseUrl` to `'from-file'` (the file's value, not the env's).
- [x] 2.2 In `test/core/reload.test.ts`, add the equivalent regression test for `RELOAD_FILE`: assert the new file's variables end up in `state.fileVariables` unmerged, and that a subsequent `SWITCH_ENV` to `(none)` resolves to the reloaded file's values.

## 3. Integration test — full repro

- [x] 3.1 In `test/integration/file-load.test.tsx`, add a regression test that drives the exact user repro: render the app with a state that has an active env (`baseUrl = http://env-value`) and one request referencing `{{baseUrl}}`, then dispatch the `o` overlay, type a file path (use a fixture under `test/fixtures/` that defines `@baseUrl = http://file-value`), press `Enter` to load, then press `E` to open the env picker, navigate to `(none)`, press `Enter`, then assert the rendered request details (after pressing `d`) show `http://file-value`, not `http://env-value`.
- [x] 3.2 Added `test/fixtures/load-revert-fixture.http` with `@baseUrl = http://file-value` and one `GET {{baseUrl}}/path` request, referenced from the new integration test.

## 4. Validation

- [x] 4.1 Run `npm test` and confirm all existing tests still pass (especially `test/core/env-switcher.test.ts:128` and `test/core/file-load.test.ts`).
- [x] 4.2 Run `npm test -- file-load` and `npm test -- reload` to confirm the new unit tests pass.
- [x] 4.3 Run `npm test -- integration/file-load` to confirm the new integration test passes.
- [x] 4.4 Run `npx tsc --noEmit` to confirm no type errors introduced.
- [x] 4.5 Run `npx eslint src/app.tsx src/core/reducer.ts test/core/file-load.test.ts test/core/reload.test.ts test/integration/file-load.test.tsx` to confirm no lint regressions.
- [x] 4.6 Verified end-to-end via the new integration test, which drives the exact keystroke sequence from the user's repro and asserts `http://file-value` (not `http://env-value`) is displayed in request details after switching to `(none)`.
