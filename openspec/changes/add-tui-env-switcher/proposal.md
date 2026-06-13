## Why

Today an environment can only be chosen at launch via `--env` / `--env-name`; switching environments while working means quitting and restarting httptui. The plumbing for swapping environment variables already exists in state (`environmentVariables` is re-merged on reload), but there is no runtime trigger. Adding an in-TUI environment switcher lets users move between Development, Staging, Production, etc. without losing their place — and surfaces which environment is currently active so the live target is never ambiguous.

## What Changes

- Add a new `E` keyboard shortcut that opens an **environment picker overlay** listing available environment names. Arrow / `j`/`k` move the highlight, `Enter` applies the selected environment, `Esc` closes the picker.
- Source the list of selectable environments from **both** `config.environments[]` (configured name → file) **and** the `--env` file's own top-level `name` field (if started with `--env`). On a name conflict, the `--env` file's name takes priority over a configured environment of the same name.
- Add a `(none)` option to the picker so the user can revert to file-level variables only (no environment applied).
- Extend `parseEnvironmentFile` to also return the environment file's top-level `name` (changing its return shape from `FileVariable[]` to `{ name: string | null; variables: FileVariable[] }`).
- Track a pristine base of file-level variables in state so switching environments re-merges from the original file variables (preventing stale variables from a previously-applied environment leaking through).
- Display the currently active environment name in the StatusBar (in `magenta`). When no environment is applied, no indicator is shown.
- Apply the selected environment at runtime by re-merging the new environment variables over the pristine file variables, resetting the response/scroll state (mirroring the existing file-load behavior). File-level variables continue to take precedence over environment variables.
- When no environments are available (no config environments and no `--env` file), pressing `E` SHALL show a brief status message ("No environments configured") rather than opening an empty picker.

## Capabilities

### New Capabilities
- `runtime-environment-switching`: Runtime selection and application of environments from within the TUI — the `E` shortcut, the environment picker overlay (including the `(none)` revert option), the aggregation and prioritization of environment names from config and the `--env` file, runtime re-merge of variables, and the active-environment status indicator.

### Modified Capabilities
- `environment-files`: `parseEnvironmentFile` SHALL additionally return the environment file's top-level `name` alongside the parsed variables, so the runtime switcher and CLI startup can surface and prioritize the file's own name.

## Impact

- **Code**:
  - `src/core/env-parser.ts` — change `parseEnvironmentFile` return shape to include `name`.
  - `src/cli.tsx` — adapt to the new parser return shape; thread `config.environments` and the active environment name (including the `--env` file's name) into `App` props.
  - `src/core/types.ts` — extend `AppState` (pristine `fileVariables`, `activeEnvName`, `availableEnvironments`, new `mode` value `'envSelect'`, selection index), `AppProps`, and the `Action` union (new env-select actions).
  - `src/core/reducer.ts` — add handlers for entering/moving/applying/canceling environment selection and switching the environment; update `createInitialState`, `LOAD_FILE`, and `RELOAD_FILE` to maintain the pristine `fileVariables` base.
  - `src/core/shortcuts.ts` — add the `E` shortcut entry.
  - `src/components/EnvSelectOverlay.tsx` — **new** picker overlay component.
  - `src/components/StatusBar.tsx` — render the active environment name indicator.
  - `src/components/Layout.tsx` / `src/app.tsx` — wire the `E` key, the overlay, the input handling for `envSelect` mode, and the StatusBar prop.
- **Tests**: env-parser, reducer, CLI wiring, and component rendering tests.
- **Docs**: README keyboard shortcuts table and Environment Configuration section.
- **Dependencies**: none added.
