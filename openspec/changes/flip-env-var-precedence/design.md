## Context

httptui resolves `{{...}}` variable placeholders from two user-facing sources: file/collection variables (declared inline in `.http` files or Postman collections) and environment file variables (loaded via `--env` or `--env-name`). Currently, `mergeVariables()` in `src/core/variables.ts` inserts file variables into a Map first, then environment variables second — giving environment variables higher precedence on name collision.

The config system (`loadConfig()` in `src/core/config.ts`) already uses shallow merge (`{ ...globalConfig, ...projectConfig }`), so project-level `environments` arrays replace global ones entirely. This means only one environment source is active per session — no layering between global and project env vars is needed.

## Goals / Non-Goals

**Goals:**
- File/collection variables SHALL take precedence over environment file variables when both define the same name.
- Update all specs, tests, and documentation to reflect the inverted precedence.
- Keep the change minimal and surgical — one function swap, test/doc updates.

**Non-Goals:**
- Changing config merge semantics (shallow merge stays as-is).
- Adding layering between global and project config environment variables.
- Changing CLI flag behavior (`--env`/`--env-name` mutual exclusivity).
- Changing environment file parsing logic.
- Changing system variable resolution (`$timestamp`, `$guid`, `$processEnv`, `$dotenv`).

## Decisions

### Decision 1: Swap insertion order in `mergeVariables()`

**Choice**: Reverse the loop order — insert environment variables into the Map first, then file variables. File variables overwrite on collision.

**Rationale**: This is the minimal code change (swap two `for` loops) that achieves the desired precedence. The Map's last-write-wins semantics naturally give file variables priority.

**Alternative considered**: Introduce a three-argument `mergeVariables(fileVars, envVars, systemVars)` with explicit priority tiers. Rejected — adds complexity for no benefit. System variables are resolved in a separate pass and don't participate in the Map merge.

### Decision 2: No changes to `loadConfig()` or CLI env loading

**Choice**: Keep `loadConfig()` shallow merge and single-environment loading in `cli.tsx` untouched.

**Rationale**: The shallow merge already ensures only one `environments` array is active (project replaces global). The user confirmed this is the desired behavior — "use only the project one." No deep merge or env-var layering between config sources is needed.

### Decision 3: Treat Postman collection variables as file variables

**Choice**: No code change needed. Postman collection variables are already returned in `ParseResult.variables` by `postman-parser.ts`, the same field as `.http` `@var = value` lines. They flow through `mergeVariables()` as `fileVariables` and naturally get highest precedence.

**Rationale**: Collection variables are defined alongside the requests they serve — same semantic as file variables. Treating them identically is consistent and requires zero code changes.

## Risks / Trade-offs

- **[Breaking change]** Users who relied on environment files overriding file variables will see the opposite. → Mitigation: This is a deliberate, documented breaking change. The README and specs will be updated. The change is a single function swap, making it easy to revert if needed.
- **[Test churn]** Tests asserting env-wins-over-file must be inverted. → Mitigation: The affected tests are well-scoped to `variables.test.ts` and related integration tests. The assertions flip but the test structure stays the same.
