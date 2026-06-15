## Context

The `flip-env-var-precedence` change (2026-06-13) swapped the order of the two `for` loops in `mergeVariables()` (`src/core/variables.ts`) so file/collection variables are inserted into the `Map` after environment variables. JavaScript's `Map` is last-write-wins on duplicate keys, so this made file variables win on name collision.

We are reverting that change. Environment files exist precisely to override file-level values per environment (e.g., a `baseUrl` in `dev.json` overriding `@baseUrl` in `api.http`). The post-2026-06-13 default surprised users; the original (pre-2026-06-13) default is intuitive.

The follow-up change `2026-06-14-add-tui-env-switcher` adopted the post-2026-06-13 default in three places (purpose statement, "Apply selected environment" requirement prose, and one scenario). It also introduced the `fileVariables` (pristine) state field and threaded `mergeVariables` through `LOAD_FILE` / `RELOAD_FILE` / `SWITCH_ENV` reducer actions. None of that infrastructure needs to change — only the documented precedence direction flips.

`mergeVariables()` is the only function whose internal order encodes the precedence. All call sites in `src/app.tsx`, `src/cli.tsx`, and `src/core/reducer.ts` pass arguments in the same `(fileVariables, environmentVariables)` order; the function's contract is "file first, env second" regardless of which one wins, so no call sites need to change.

## Goals / Non-Goals

**Goals:**
- Environment file variables SHALL take precedence over file/collection variables on name collision.
- Update the three affected specs (`variables`, `environment-files`, `runtime-environment-switching`) and all related tests/docs to reflect the inverted precedence.
- Keep the change minimal and surgical — one loop swap plus matching test/doc updates.
- No changes to config merge semantics, env file parsing, CLI flag behavior, or the runtime switcher mechanism itself.

**Non-Goals:**
- Changing the `mergeVariables(fileVars, envVars)` signature or argument order.
- Changing `loadConfig()` shallow merge.
- Adding layering between global and project config environment variables.
- Changing CLI flag behavior (`--env` / `--env-name` mutual exclusivity).
- Changing environment file parsing logic or `parseEnvironmentFile`'s return shape.
- Changing system variable resolution (`$timestamp`, `$guid`, `$processEnv`, `$dotenv`).
- Removing the `runtime-environment-switching` capability or the `(none)` revert option.

## Decisions

### Decision 1: Swap the two `for` loops in `mergeVariables()`

**Choice**: Reverse the loop order in `mergeVariables()` — insert file variables into the `Map` first, then environment variables. Environment variables overwrite on collision.

**Rationale**: Minimal code change (swap two `for` loops) that achieves the desired precedence. `Map`'s last-write-wins semantics naturally give environment variables priority. The function's public signature is unchanged, so all four call sites continue to work without modification.

**Alternative considered**: Reorder the function arguments to `mergeVariables(envVars, fileVars)`. Rejected — requires updating every call site, increases diff size, and risks subtle ordering bugs in `LOAD_FILE` / `RELOAD_FILE` / `SWITCH_ENV` which intentionally use the `(file, env)` order to keep the pristine `fileVariables` base separate from the active `environmentVariables`.

### Decision 2: Do not touch the runtime environment switcher mechanism

**Choice**: Keep the picker overlay, the `E` shortcut, the `fileVariables` / `activeEnvName` / `availableEnvironments` state fields, the `ENTER_ENV_SELECT` / `MOVE_ENV_SELECTION` / `SWITCH_ENV` / `CANCEL_ENV_SELECT` actions, and the `SWITCH_ENV` reducer handler entirely intact.

**Rationale**: The switcher just calls `mergeVariables(state.fileVariables, action.environmentVariables)` in the `SWITCH_ENV` handler. With the loop swap, the resulting `variables` map now has env-wins semantics — exactly what we want. The switcher infrastructure is orthogonal to the precedence direction.

### Decision 3: Flip the affected scenarios in the three specs

**Choice**: Update `variables/spec.md` "Resolution order", `environment-files/spec.md` "File variables take precedence" requirement, and `runtime-environment-switching/spec.md` "Apply selected environment" requirement + the "File variables still win after switching" scenario to state the inverted precedence.

**Rationale**: The specs are the contract — they need to match the new behavior. The `runtime-environment-switching` "File variables still win after switching" scenario in particular is a direct copy of the wrong default from the follow-up change and must invert.

## Risks / Trade-offs

- **[Breaking change]** Users who relied on the post-2026-06-13 file-wins default will see environment variables win on collision. → Mitigation: This is a deliberate, documented breaking change. The README and all three affected specs are updated. The change is a one-loop swap, making rollback trivial if needed.
- **[Test churn]** Three tests need renaming/assertion flipping: `mergeVariables` in `test/core/variables.test.ts`, `SWITCH_ENV` "preserves file-variable precedence" in `test/core/env-switcher.test.ts`. → Mitigation: Same diff size as the original flip. Structure stays identical; only the direction and labels change.
- **[Spec churn across multiple files]** Three spec files change. → Mitigation: Each change is a small, scoped `MODIFIED Requirements` delta. The `runtime-environment-switching` delta is the only one that wasn't in the original `flip-env-var-precedence` change — it's a follow-up correction.
