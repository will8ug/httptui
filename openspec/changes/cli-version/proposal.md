## Why

The CLI has no way to report its version. Users debugging installs (global install vs `npm link`, stale versions) must inspect `package.json` manually, and support/reporting workflows have no `httptui --version` output to anchor on. Every mainstream CLI exposes `-v`/`--version`; httptui currently treats `-v` as an unknown positional and tries to open a file literally named `-v`.

## What Changes

- Recognize `-v` and `--version` flags in the CLI argument parser (`src/args.ts`).
- When either flag is present, print the current released version (from `package.json`) to stdout and exit with code 0, before any file loading or validation.
- The version flag short-circuits everything: `httptui --version`, `httptui -v`, and `httptui -v api.http` all print the version and exit; the TUI never launches.
- Source the version string via a static JSON import of `package.json` (inlined at build time by tsup — the pattern used by vitest, tsup, and tsx).
- Document the new flags in the README options table.

## Capabilities

### New Capabilities
- `cli-version`: The CLI recognizes `-v`/`--version`, prints the current version to stdout, and exits successfully without launching the TUI.

### Modified Capabilities

(none — no existing capability's requirements change)

## Impact

- **Code**: `src/args.ts` (new flag recognition), `src/cli.tsx` (early version check before the usage guard), new `src/version.ts` module.
- **Build/tooling**: none — `resolveJsonModule` is already enabled in `tsconfig.json`; tsup inlines JSON imports natively; vitest/Vite resolves JSON imports natively. No new dependencies.
- **Docs**: README options table gains one row.
- **Compatibility**: purely additive. `-v`/`--version` previously fell through to the positional file path (guaranteed error), so no working invocation changes behavior.
