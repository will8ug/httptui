## 1. Environment file parser

- [x] 1.1 Change `parseEnvironmentFile` in `src/core/env-parser.ts` to return `{ name: string | null; variables: FileVariable[] }`; extract the top-level `name` (non-empty string → that string, else `null`) and keep the existing variable-parsing logic for `variables`
- [x] 1.2 Update `src/cli.tsx` to consume the new return shape: read `variables` for merging and capture `name` from the `--env` file
- [x] 1.3 Update env-parser tests in `test/` to assert the new return shape across all existing scenarios (name present, name absent/empty/non-string, disabled vars, mixed/non-string values, invalid JSON, non-object)

## 2. State and action types

- [x] 2.1 In `src/core/types.ts`, add `'envSelect'` to `AppMode`
- [x] 2.2 Add to `AppState`: `fileVariables: FileVariable[]` (pristine base), `activeEnvName: string | null`, `availableEnvironments: EnvOption[]`, and `envSelectIndex: number`, `envSelectError: string | null`
- [x] 2.3 Add an `EnvOption` interface `{ name: string; file: string | null }` to `src/core/types.ts`
- [x] 2.4 Add to `AppProps`: `fileVariables: FileVariable[]`, `activeEnvName: string | null`, `availableEnvironments: EnvOption[]`
- [x] 2.5 Add to the `Action` union: `ENTER_ENV_SELECT`, `MOVE_ENV_SELECTION` (`direction: 'up' | 'down'`), `SWITCH_ENV` (`environmentVariables: FileVariable[]`; `envName: string | null`), `CANCEL_ENV_SELECT`, `SET_ENV_SELECT_ERROR` (`error: string`)

## 3. Reducer

- [x] 3.1 Update `createInitialState` to populate `fileVariables`, `activeEnvName`, `availableEnvironments` from props and initialize `envSelectIndex: 0`, `envSelectError: null`
- [x] 3.2 Update `LOAD_FILE` and `RELOAD_FILE` to set `fileVariables = action.variables` (raw file vars) and `variables = mergeVariables(action.variables, state.environmentVariables)`, preserving the active environment
- [x] 3.3 Implement `ENTER_ENV_SELECT`: set `mode: 'envSelect'`, `envSelectError: null`, and initialize `envSelectIndex` to the active environment's option index (or the `(none)` option index when no environment is active)
- [x] 3.4 Implement `MOVE_ENV_SELECTION`: move `envSelectIndex` up/down clamped to `[0, optionCount-1]` with no wrap
- [x] 3.5 Implement `SWITCH_ENV`: set `environmentVariables = action.environmentVariables`, `variables = mergeVariables(state.fileVariables, action.environmentVariables)`, `activeEnvName = action.envName`, reset `response`, `error`, and scroll offsets, set `mode: 'normal'`, clear `envSelectError`
- [x] 3.6 Implement `CANCEL_ENV_SELECT`: set `mode: 'normal'`, clear `envSelectError`, leave environment unchanged
- [x] 3.7 Implement `SET_ENV_SELECT_ERROR`: set `envSelectError = action.error`, keep `mode: 'envSelect'`
- [x] 3.8 Add reducer tests covering: switch re-merge, file-variable precedence after switch, no-stale-leak across switches, `(none)` revert, reload/file-load preserving active environment, navigation clamping, cancel leaves environment unchanged

## 4. Shortcut registration

- [x] 4.1 Add `{ key: 'E', label: 'Env', description: 'Switch environment', showInBar: false, showInHelp: true, group: 'request' }` to `SHORTCUTS` in `src/core/shortcuts.ts`
- [x] 4.2 Add/adjust shortcuts tests asserting the `E` entry exists with the specified fields and does not appear in the status bar

## 5. Environment picker overlay component

- [x] 5.1 Create `src/components/EnvSelectOverlay.tsx` with props `{ options: EnvOption[]; selectedIndex: number; activeEnvName: string | null; error: string | null }`
- [x] 5.2 Render matching overlay conventions: centered, round `cyanBright` border, width `Math.min(72, Math.max(48, columns - 6))`, `cyanBright` bold title `Select Environment`, `gray` footer hint (`↑↓ move · Enter apply · Esc cancel`)
- [x] 5.3 Render each option row; highlighted row in `cyan` bold; active environment row prefixed with `magenta` `● `; render inline error in `red` when present
- [x] 5.4 Add component test(s) for highlight styling, active marker, and error rendering

## 6. App wiring (input + overlay + status bar)

- [x] 6.1 In `src/app.tsx`, handle `E` in normal mode: if `availableEnvironments` has selectable entries beyond `(none)` dispatch `ENTER_ENV_SELECT`; otherwise set the transient `No environments configured` status message (reuse the `reloadMessage` + `CLEAR_RELOAD_MESSAGE` 2s pattern) and do not open the overlay; ignore `E` while help/fileLoad/search are active
- [x] 6.2 In the `useInput` handler, add an `envSelect` mode branch: up/`k` and down/`j` dispatch `MOVE_ENV_SELECTION`; `Esc` dispatches `CANCEL_ENV_SELECT`; `Enter` resolves the highlighted option, reads+parses its file (or applies empty vars for `(none)`), and dispatches `SWITCH_ENV`, dispatching `SET_ENV_SELECT_ERROR` on read/parse failure
- [x] 6.3 Render `EnvSelectOverlay` in the `Layout.overlay` slot when `mode === 'envSelect'`, keeping single-overlay mutual exclusion with help/fileLoad
- [x] 6.4 Pass `envName={state.activeEnvName}` to `StatusBar`
- [x] 6.5 In `src/components/StatusBar.tsx`, add `envName: string | null` prop and render it in the right segment before `reloadMessage` in `magenta` bold with two trailing spaces; render nothing when `null`

## 7. CLI aggregation and props threading

- [x] 7.1 In `src/cli.tsx`, build `availableEnvironments` from `config.environments[]` mapped to `{ name, file }`
- [x] 7.2 If launched with `--env <path>` and the parsed file has a top-level `name`, add/replace the matching option so the `--env` file's name wins on conflict
- [x] 7.3 Compute the initial `activeEnvName`: `--env-name` → the name; `--env` → the file's top-level name (fallback to the file basename without extension when absent); neither → `null`
- [x] 7.4 Pass `fileVariables` (raw parsed file/collection variables), `activeEnvName`, and `availableEnvironments` into `<App>` props; ensure `variables` is still the merged result for initial render
- [x] 7.5 Add CLI-level tests for aggregation, conflict prioritization, and initial active-name resolution

## 8. Documentation and verification

- [x] 8.1 Update `README.md`: add `E` to the keyboard shortcuts table (Request section) and document the runtime environment switcher in the Environment Configuration section
- [x] 8.2 Run `lsp_diagnostics` on all changed files and ensure they are clean
- [x] 8.3 Run the build and full test suite; ensure exit code 0 with all tests passing
- [x] 8.4 Run `openspec validate add-tui-env-switcher --strict` and confirm it passes
