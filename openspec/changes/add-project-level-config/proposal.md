## Why

Currently, httptui only supports a single global config file (`~/.config/httptui/config.json`). This forces developers to either centralize all client certificates in their home directory or manually manage per-project overrides. Adding project-level config discovery allows teams to commit `.httptui.json` alongside their `.http` files, making request collections self-contained and portable.

## What Changes

- Add `.httptui.json` sidecar config file discovery in the same directory as the `.http` file
- Implement cascading merge: project config takes precedence over global config for all top-level keys
- Make `$dotenv` variable resolution relative to the `.http` file's directory instead of `process.cwd()`
- Re-discover config on runtime file switch (`LOAD_FILE`) so switching to a different project uses its config
- Relative paths in project config resolve against the project config's directory; global config paths still resolve against `~/.config/httptui/`

## Capabilities

### New Capabilities
- `project-level-config`: Sidecar `.httptui.json` discovery, loading, and shallow merge with global config. Project values override global values for the same hostname or other top-level keys.

### Modified Capabilities
- `global-config`: Config discovery now includes an optional project-level lookup step before falling back to global. The merge behavior is added as a requirement.
- `variables`: The `$dotenv` system variable now resolves `.env` files from the `.http` file's directory instead of `process.cwd()`.

## Impact

- `src/core/config.ts`: Add project-level discovery and merge logic
- `src/core/variables.ts`: Change `$dotenv` base directory from `process.cwd()` to `.http` file's directory
- `src/cli.tsx`: Pass `.http` file directory to config loader at startup
- `src/app.tsx`: Re-discover config on `LOAD_FILE` action, pass config directory to execution context
- `test/config.test.ts`: Add tests for merge behavior and precedence
- `test/variables.test.ts`: Update `$dotenv` tests for new base directory behavior
- `README.md`: Document `.httptui.json` usage
