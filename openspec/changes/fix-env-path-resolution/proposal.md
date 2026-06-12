## Why

When both a global config (`~/.config/httptui/config.json`) and a project-level config (`.httptui.json`) exist, environment file paths from the global config are resolved against the wrong base directory. The `loadConfig()` merge sets a single `configDir` to the project directory, but environment entries inherited from the global config need their paths resolved against the global config directory. This causes `--env-name` to fail with "Environment file not found" even though the file exists in the correct location.

## What Changes

- Fix `loadConfig()` in `config.ts` to preserve the origin directory for each config section, so that relative paths are resolved against the directory of the config file that declared them.
- Fix env-name path resolution in `cli.tsx` (and `reducer.ts` for runtime file-load) to use the correct base directory depending on which config source provided the `environments` array.
- Add tests covering the scenario where global config provides `environments` and a project config also exists.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

_None._ The existing `environment-config` spec already describes the correct behavior (resolve env file paths relative to the config directory that declared them). This is an implementation fix to match the existing spec.

## Impact

- **Files**: `src/core/config.ts` (merge logic), `src/cli.tsx` (env-name resolution at startup), `src/core/reducer.ts` (env-name resolution on runtime file load), `src/core/types.ts` (potentially new fields on `HttptuiConfig`).
- **Tests**: `test/config.test.ts`, `test/cli-smoke.test.ts`, `test/variables.test.ts` — new test cases for the mixed-config scenario.
- **No breaking changes**: The fix only corrects path resolution when both configs exist. Single-config behavior is unchanged.
