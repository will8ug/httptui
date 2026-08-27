## Why

httptui has no `--help` flag. Users who forget the syntax get a bare `Usage: httptui <file.http>` error with no pointer to the other flags (`--env`, `--env-name`, `--insecure`, `--version`), and must consult the README to discover them. A help flag is table stakes for a CLI and the natural place to surface the full option set.

## What Changes

- Add `-h`/`--help` boolean flags recognized by the argument parser.
- When either flag is present, print help text (usage line, all five flag pairs, a `?` hint pointing to the in-app shortcuts overlay) to stdout and exit with code 0, without launching the TUI and without requiring a file argument.
- Help takes precedence over version: when both `-h` and `-v` are present, the help text is printed.
- Enhance the no-file usage error to follow the GNU convention: the error message on stderr includes `Try 'httptui --help' for more information.`
- Document the new flag in the README options table.

## Capabilities

### New Capabilities

- `cli-help`: CLI help flag recognition (`-h`/`--help`), help output format and stream/exit-code contract, precedence over other early-exit flags, and the no-file usage error pointing users to `--help`.

### Modified Capabilities

- `cli-version`: the "Version flag recognition" requirement currently states the version string is printed whenever `-v`/`--version` is present. Help-first precedence contradicts that literal reading when both a help and a version flag are given, so the requirement gains a carve-out deferring to `cli-help` when a help flag is present.

The no-file usage-error behavior is prose in the `tui` spec's interface map (Startup section), not a formal requirement; formalizing its enhanced form in `cli-help` follows the established pattern of keeping CLI-boundary behavior in capability specs. `tui` itself needs no delta.

## Impact

- `src/args.ts`: new `HELP_FLAGS` set and `help: boolean` field in the `parseArgs` return type.
- `src/help.ts`: new module exporting the help text (mirrors the `src/version.ts` sibling-module pattern).
- `src/cli.tsx`: help check before the version check; enhanced no-file error message.
- `test/cli-args.test.ts`: every existing `toEqual` assertion (about 25) mechanically gains `help: false`; new cases for `-h`/`--help` positions and combinations.
- `README.md`: one new row in the options table.
