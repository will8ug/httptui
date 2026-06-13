## Context

httptui is an Ink/React TUI with `useReducer`-based state (`src/core/reducer.ts`). Environment loading is currently a launch-time-only concern handled in `src/cli.tsx`:

- `--env <path>` reads a file directly; `--env-name <name>` looks the name up in `config.environments[]` (from `config.json` / `.httptui.json`) and resolves a file path.
- Either path calls `parseEnvironmentFile(content)` which today returns `FileVariable[]` and **discards** the file's top-level `name`.
- The parsed environment variables are merged with file/collection variables via `mergeVariables(fileVariables, environmentVariables)` where **file variables win**, and passed to `<App>` as `props.variables` plus `props.environmentVariables`.

At runtime, `AppState` already carries `environmentVariables`, and `LOAD_FILE` / `RELOAD_FILE` re-merge it. But:
1. There is no UI to change which environment is active.
2. `state.variables` is the *already-merged* result, so it cannot serve as a clean base for re-merging a different environment — stale variables from the prior environment would leak.
3. The set of available environment names (`config.environments[]`) is never threaded into `App`, and the `--env` file's own `name` is never captured.

The component conventions are established: overlays use `borderStyle="round"`, `borderColor="cyanBright"`, are centered with `justifyContent="center" alignItems="center"`, and width `Math.min(72, Math.max(48, columns - 6))`. Only one overlay may be active at a time (`Layout.overlay` is a single slot). The `mode` field (`'normal' | 'fileLoad' | 'search'`) gates input handling. Shortcuts are centralized in `src/core/shortcuts.ts` and auto-consumed by StatusBar and HelpOverlay.

## Goals / Non-Goals

**Goals:**
- Switch the active environment at runtime via an `E`-triggered picker overlay, without restarting.
- Aggregate selectable environment names from both `config.environments[]` and the `--env` file's top-level `name`, with the `--env` file's name taking priority on conflict.
- Provide a `(none)` option to revert to file-level variables only.
- Re-merge correctly from a pristine file-variable base so no stale environment variables leak between switches.
- Show the active environment name in the StatusBar.

**Non-Goals:**
- Auto-discovering environment files by scanning directories (only configured environments + the explicit `--env` file).
- Editing, creating, or persisting environments from the TUI.
- Changing variable precedence rules (file/collection variables continue to win over environment variables).
- Secret masking or `type` field handling (unchanged from current behavior).
- Re-resolving `--env-name` config lookups differently than today's reload behavior.

## Decisions

### Decision 1: New `mode: 'envSelect'` and dedicated actions (mirror file-load pattern)
Add `'envSelect'` to `AppMode` and a new set of actions following the existing `ENTER_FILE_LOAD` / `CANCEL_FILE_LOAD` / `LOAD_FILE` shape:
- `ENTER_ENV_SELECT` — sets `mode: 'envSelect'`, initializes the highlight index to the currently active environment (or `(none)`).
- `MOVE_ENV_SELECTION` (`direction: 'up' | 'down'`) — moves the highlight within the option list (clamped, no wrap, consistent with request list navigation).
- `SWITCH_ENV` — applies the chosen environment: sets `environmentVariables`, re-merges into `variables`, sets `activeEnvName`, resets response/scroll, returns to `'normal'` mode.
- `CANCEL_ENV_SELECT` — returns to `'normal'` mode without changing the environment.
- `SET_ENV_SELECT_ERROR` — stores an inline error (e.g., env file went missing) without leaving the overlay.

**Why over reusing `'fileLoad'`:** The file-load overlay is a free-text input; the env picker is a selection list with distinct state (highlight index, option list) and distinct rendering. Reusing the mode would tangle two unrelated input models. The action *pattern* is reused; the mode is separate.

### Decision 2: Track pristine `fileVariables` separately in state
Add `fileVariables: FileVariable[]` to `AppState` holding the original parsed file/collection variables (before any environment merge). `state.variables` remains the merged view used for resolution.

- `createInitialState`: `fileVariables = props.fileVariables` (new prop carrying the un-merged base); `variables = props.variables` (already merged at startup).
- `LOAD_FILE` / `RELOAD_FILE`: set `fileVariables = action.variables` (the freshly parsed file vars) **and** `variables = mergeVariables(action.variables, state.environmentVariables)` so the active environment is re-applied on top of the new file's base.
- `SWITCH_ENV`: `variables = mergeVariables(state.fileVariables, action.environmentVariables)`.

**Why over re-merging `state.variables`:** `state.variables` already contains the previous environment's values. Re-merging it with a new environment would not remove keys unique to the old environment (e.g., switching Staging→Production leaves a Staging-only key behind). A pristine base eliminates this leak. Alternative considered — recompute by subtracting old env keys — is more error-prone and stateful.

> Note: this slightly changes `LOAD_FILE`/`RELOAD_FILE` to compute `variables` via merge rather than taking `action.variables` directly. The current `app.tsx` call sites already pre-merge before dispatching; the design moves the merge responsibility into the reducer for consistency. Implementation must update those call sites to pass raw file variables (not pre-merged) OR keep pre-merging and have the reducer store both — the tasks will pin this down to avoid double-merging.

### Decision 3: Aggregate environment names; `--env` file name wins on conflict
Introduce an `availableEnvironments: EnvOption[]` concept where `EnvOption = { name: string; file: string | null }` (`file: null` only for the `(none)` sentinel).

Aggregation at startup (in `cli.tsx`, passed via props):
1. Start with `config.environments[]` mapped to `{ name, file }`.
2. If launched with `--env <path>` and the parsed file has a top-level `name`, build an option for it. If that name collides with a configured name, the `--env` file's entry **replaces** the configured one (file's name wins).
3. The picker prepends a synthetic `(none)` option (`file: null`).

**Why `--env` file wins:** The user explicitly pointed at that file on the command line; its self-declared identity should override a coincidental config name match. (User decision.)

**Active name resolution at startup:** If `--env-name <name>` was used, `activeEnvName = <name>`. If `--env <path>` was used, `activeEnvName =` the file's top-level `name` (or a fallback label derived from the path if the file has no name). If neither, `activeEnvName = null`.

### Decision 4: Extend `parseEnvironmentFile` return shape
Change the return type from `FileVariable[]` to `{ name: string | null; variables: FileVariable[] }`. `name` is the top-level `name` string if present and non-empty, else `null`. `variables` is the existing parsed list.

**Why a shape change over a second function:** A second `parseEnvironmentName` would read and `JSON.parse` the file twice. Returning both from one parse is cleaner. (User approved breaking the return shape; only one production call site — `cli.tsx` — plus tests.)

### Decision 5: Picker behavior when no environments exist
If `availableEnvironments` contains only the `(none)` sentinel (no config environments and no `--env` file name), pressing `E` SHALL **not** open the overlay; instead it sets a transient `reloadMessage`-style status "No environments configured" (auto-cleared after ~2s, reusing the existing `CLEAR_RELOAD_MESSAGE` timer pattern). (User decision (b).)

### Decision 6: Picker visuals and StatusBar indicator
- Overlay matches `FileLoadOverlay`: round `cyanBright` border, centered, width `clamp(48..72)`, title `cyanBright` bold ("Select Environment"), gray footer hint (`↑↓ move · Enter apply · Esc cancel`).
- Each option row renders the name; the highlighted row uses `cyan` bold (inverse-style emphasis); the currently active environment is marked with a `magenta` `● ` prefix.
- StatusBar gains an `envName: string | null` prop rendered in the right segment **before** `reloadMessage`, in `magenta` bold with two trailing spaces. When `null`, nothing renders. (User approved color design.)

## Risks / Trade-offs

- **Double-merge / precedence drift in `LOAD_FILE`/`RELOAD_FILE`** → Moving merge into the reducer risks merging twice if call sites still pre-merge. Mitigation: tasks explicitly update `app.tsx` to dispatch raw file variables, and add reducer tests asserting file-variable precedence is preserved after a switch + reload.
- **Environment file deleted/changed between launch and switch** → Applying a config-listed environment reads the file lazily on `SWITCH_ENV`; the file may be missing. Mitigation: `SWITCH_ENV` flow handles read/parse errors by dispatching `SET_ENV_SELECT_ERROR` and keeping the overlay open (mirrors `SET_FILE_LOAD_ERROR`).
- **`--env` file with no `name`** → Cannot show a meaningful active label. Mitigation: fall back to a derived label (e.g., basename) for display while still allowing `(none)` revert.
- **Active label vs. switched-away state** → After switching to `(none)`, the `--env`-launched environment is still selectable (its option persists); only the active marker moves. Acceptable and expected.
- **Mode mutual-exclusion** → Only one overlay slot exists. Mitigation: `E` is ignored while `showHelp`, `fileLoad`, or `search` modes are active, consistent with existing guards in `app.tsx`.

## Open Questions

- None blocking. The `--env` file fallback display label (basename vs. literal path) is a minor cosmetic choice resolved during implementation; default is the file's basename without extension.
