## Why

The `flip-env-var-precedence` change (archived 2026-06-13) inverted the variable merge order so that file/collection variables take precedence over environment file variables. In practice this is the wrong default: environment files exist precisely to override file-level values per environment, and users expect `--env` / `--env-name` to win name collisions. Reverting restores that intuitive behavior.

## What Changes

- **BREAKING**: Flip the variable merge order in `mergeVariables()` back to the pre-2026-06-13 behavior — environment file variables SHALL take precedence over file/collection variables on name collision.
- Update the `variables` spec: the "Resolution order" requirement and its precedence scenarios invert to env-vars-wins.
- Update the `environment-files` spec: rename the "File variables take precedence over environment variables" requirement back to "Environment variables take precedence over file variables" and flip its scenarios.
- Update the `runtime-environment-switching` spec: the language asserting "file-level variables taking precedence" inverts to "environment variables taking precedence" (this spec was added by the follow-up `2026-06-14-add-tui-env-switcher` change and adopted the wrong default).
- Update the `mergeVariables` test in `test/core/variables.test.ts`: rename and flip the precedence assertion.
- Update the `SWITCH_ENV` precedence test in `test/core/env-switcher.test.ts`: rename and flip the assertion.
- Update `README.md` "Environment Files" paragraph: invert the precedence statement.

No changes to config loading (`loadConfig()` shallow merge), CLI flag behavior, env file parsing, Postman collection variable handling, or the runtime environment switcher mechanism itself (only the documented precedence direction changes).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `variables`: "Resolution order" requirement inverts — environment file variables now take precedence over file/collection variables on collision. Scenarios for file-wins and collection-wins flip to env-wins equivalents; the "env as default" scenario is removed (env no longer needs a fallback role when it wins).
- `environment-files`: "File variables take precedence over environment variables" requirement inverts back to "Environment variables take precedence over file variables" with flipped scenarios.
- `runtime-environment-switching`: Purpose statement and "Apply selected environment at runtime" requirement update the documented precedence from "file-level variables taking precedence" to "environment variables taking precedence". The "File variables still win after switching" scenario flips to an "Environment variables still win after switching" scenario.

## Impact

- **Code**: `mergeVariables()` in `src/core/variables.ts` — swap insertion order back (file vars first, env vars second).
- **Tests**: `test/core/variables.test.ts` (`mergeVariables` describe block) and `test/core/env-switcher.test.ts` (`SWITCH_ENV reducer` block).
- **Docs**: `README.md` "Environment Files" paragraph.
- **Specs**: `openspec/specs/variables/spec.md`, `openspec/specs/environment-files/spec.md`, `openspec/specs/runtime-environment-switching/spec.md`.
- **User-facing behavior**: Users who relied on the post-2026-06-13 file-wins default will see environment variables win on collision again. This is a deliberate breaking change reverting to the original, more intuitive precedence.
