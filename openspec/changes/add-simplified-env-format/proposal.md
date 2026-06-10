## Why

httptui currently only supports loading Postman environment files (`.postman_environment.json`). However, many users want a simpler, more portable environment format that doesn't require Postman-specific metadata fields. Adding a simplified environment format allows users to define environment variables in a clean JSON structure while still being fully compatible with the existing Postman format.

## What Changes

- Add a simplified environment file format that is a subset of the Postman format (no `id`, `type`, or `_postman_variable_scope` fields required).
- Allow environment files to be configured in `config.json` or `.httptui.json` under an `environments` array with `name` and `file` fields.
- Add a new CLI option `--env-name` (with short form `-E`) to select an environment by name from the config file.
- Ensure `--env` and `--env-name` are mutually exclusive (only one can be specified at a time).
- Rename `postman-env-parser.ts` to `env-parser.ts` to reflect that it handles both formats.
- Update the existing `parsePostmanEnvironment` function to be generic enough to handle both formats (already works for the simplified format due to its field-agnostic parsing).
- Update existing OpenSpec spec to include the new environment format and CLI flag.

## Capabilities

### New Capabilities
- `simplified-environment`: Support for a simplified environment file format that is compatible with the Postman format but omits Postman-specific metadata.
- `environment-config`: Support for configuring environment files in `config.json` and `.httptui.json` via an `environments` array.
- `env-name-cli`: Support for selecting environments by name via `--env-name` and `-E` CLI flags.

### Modified Capabilities
- `postman-environment`: Update to include the new simplified format as a valid input (the parser already supports it, but the spec should formally allow it). Rename to `env-parser` or extend the existing spec to cover both formats.

## Impact

- `src/core/postman-env-parser.ts` → `src/core/env-parser.ts` (rename, function rename)
- `src/core/config.ts` (add `environments` to config type and parsing logic)
- `src/core/types.ts` (add new `EnvironmentConfig` and `HttptuiConfig` types)
- `src/args.ts` (add `--env-name` / `-E` parsing and mutual exclusivity with `--env`)
- `src/cli.tsx` (add logic to resolve `--env-name` to a file path via config, then parse the file)
- Test files for new CLI behavior and config parsing
- Documentation (README.md) for new CLI flag and config option
- OpenSpec specs: `postman-environment/spec.md` will be updated

## Notes

- The simplified format is intentionally a subset of the Postman format so that the same parser logic can be reused. The existing `parsePostmanEnvironment` function is already field-agnostic and will work correctly with the simplified format.
- No breaking changes to existing `--env` behavior.
- TUI switcher is out of scope for this change.
