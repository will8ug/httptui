## Why

When the user loads a different `.http` file (or reloads the current one) while a runtime environment is active, then later switches the environment to `(none)`, the displayed variables still come from the **previous** environment instead of the **new** file's variables. This violates the existing spec `runtime-environment-switching` ("Pristine file-variable base preserved across reload and file load") and makes the `(none)` env option unreliable after a file change.

Concrete repro: `httptui --env LocalAPI.json examples/mtls.http`, press `o` and load `examples/local-apis.http` (which defines `@baseUrl = http://localhost:10001`), then press `E` and choose `(none)`. The request details still show `http://local-api-hostname:10001` (from `LocalAPI.json`) instead of the file's `http://localhost:10001`.

## What Changes

- **`src/app.tsx`** — In the `o` (file load) and `R` (reload) keypress handlers, stop pre-merging `parseResult.variables` with `state.environmentVariables` before dispatching. Dispatch the file's pristine variables directly. The `LOAD_FILE` and `RELOAD_FILE` reducers already perform the correct merge with `state.environmentVariables`.
- **`test/core/file-load.test.ts`** — Add a regression unit test that asserts `state.fileVariables` contains only the new file's variables (no env contamination) after a `LOAD_FILE` while an environment is active, and that `state.variables` still applies the active env over those file vars for resolution.
- **`test/core/reload.test.ts`** — Add the same regression test for `RELOAD_FILE`.
- **`test/integration/file-load.test.tsx`** — Add an end-to-end regression that drives the exact bug repro (load file → switch env to `(none)` → assert file's value is shown).
- **`specs/runtime-environment-switching`** — Add a new scenario under the "Pristine file-variable base preserved across reload and file load" requirement that explicitly covers the load-then-revert-to-none flow.

No public API changes. No breaking changes. The visible behavior change is that `(none)` will correctly show the currently loaded file's variables (matching what the spec already says should happen).

## Capabilities

### New Capabilities
- *(none)*

### Modified Capabilities
- `runtime-environment-switching`: Add a regression scenario that locks in the invariant — after loading a different file with an active env, applying `(none)` MUST fall back to the *new* file's variables, not the previous env's.

## Impact

- **Affected code:**
  - `src/app.tsx` — remove two pre-merge calls (lines 184 and 386)
  - `src/core/reducer.ts` — no change required; behavior already matches spec
  - Tests under `test/core/file-load.test.ts`, `test/core/reload.test.ts`, `test/integration/file-load.test.tsx`
- **APIs:** none
- **Dependencies:** none
- **User-visible behavior:** `(none)` env option now correctly shows the currently loaded file's variables instead of the previous environment's variables.
