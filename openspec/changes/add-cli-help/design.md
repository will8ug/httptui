## Context

The CLI parses arguments with a hand-rolled parser (`src/args.ts`) built on flag `Set`s (`INSECURE_FLAGS`, `ENV_FILE_FLAGS`, `ENV_NAME_FLAGS`, `VERSION_FLAGS`) returning a typed object. `src/cli.tsx` consumes it and implements one early-exit path today: `version` prints to stdout and exits 0 before any file validation; the no-file path prints `Usage: httptui <file.http>` to stderr and exits 1. See proposal.md for motivation.

Value-taking flags reject any next argument starting with `-` (so `--env -h` cannot swallow `-h` as a value — same guard the `--env --version` tests pin).

## Goals / Non-Goals

**Goals:**

- `-h`/`--help` recognized everywhere the other boolean flags are: any position, combined with other flags.
- Help prints to stdout, exits 0, before version handling and before any file/env validation.
- Help-first precedence when both help and version flags are present.
- No-file usage error gains `Try 'httptui --help' for more information.`
- Help text lives in its own module, unit-testable without spawning the CLI.

**Non-Goals:**

- No change to the in-TUI `?` shortcuts overlay.
- No man page, no generated docs, no subcommand structure.
- No replacement of the hand-rolled parser with an options framework.

## Decisions

### Decision 1: `HELP_FLAGS` set + `help` boolean in `parseArgs`

Add `const HELP_FLAGS = new Set(['--help', '-h'])`, scan it with `.some()` like `insecure`/`version`, skip it in the positional loop, and return `help: boolean`.

Alternative considered: adopting `commander`/`yargs`/`util.parseArgs`. Rejected — the codebase deliberately hand-rolls five flags with zero dependencies; a help flag does not justify a parser dependency or a rewrite of ~25 passing tests' semantics.

### Decision 2: help text in `src/help.ts`

Export a `HELP_TEXT` string constant from a new `src/help.ts`, mirroring `src/version.ts`.

Alternative considered: inline template literal in `cli.tsx`. Rejected — `cli.tsx` is already the largest source file at entry time and the text is ~10 lines; a sibling module keeps the entry point lean and lets tests assert content by import.

### Decision 3: check order in `cli.tsx` — help, then version, then file validation

```text
if (help)        { stdout.write(HELP_TEXT); exit(0) }
if (version)     { stdout.write(version);   exit(0) }
if (!filePath)   { stderr 'Usage: httptui <file>' + "Try 'httptui --help' ..."; exit(1) }
```

Help-first implements the agreed precedence; both early-exit flags remain ahead of the usage error, so `httptui -h` with no file prints help, not the error. The usage error message becomes two lines, both on stderr:

```text
Usage: httptui <file>
Try 'httptui --help' for more information.
```

Alternative considered: single combined line. Rejected — GNU convention separates the usage line from the suggestion, and the spec pins only the `Try 'httptui --help' for more information.` text.

### Decision 4: help text content — exactly the agreed scope

```text
Usage: httptui [options] <file>

Options:
  -h, --help              Show this help message and exit
  -v, --version           Print the current version and exit
  -k, --insecure          Skip TLS certificate verification
  -e, --env <file>        Load an environment file (Postman or simplified format)
  -E, --env-name <name>   Select an environment by name from the config file

Press ? inside the TUI for keyboard shortcuts.
```

Descriptions reuse the README options table wording verbatim to avoid inventing a second dialect.

### Decision 5: `cli-version` delta carve-out

Help-first contradicts the literal reading of `cli-version`'s "When either flag is present, the system SHALL print the released version string". The change therefore carries a MODIFIED delta on that requirement adding the no-help-flag condition. The both-flags scenario lives only in `cli-help` (precedence is help-capability behavior) — `cli-version` keeps its original scenarios, which all still hold.

Alternative considered: specify precedence only in `cli-help` and leave `cli-version` untouched. Rejected — after archive the main specs would literally disagree in the both-flags case.

### Decision 6: test strategy

- Existing `toEqual` assertions in `test/cli-args.test.ts` compare the full return object, so adding `help` fails them all mechanically; each gains `help: false`.
- New tests mirror the existing `-v` block: `-h`/`--help` alone, before/after a file path, combined with other flags, `--env -h` value-guard, and help-before-version ordering.

## Risks / Trade-offs

- [~25 assertions break on the return-type change] → They fail loudly and trivially; the mechanical `help: false` addition is one task item, not a hunt.
- [Help text and README options table can drift] → Accepted duplication: README is the documentation surface, `HELP_TEXT` the runtime surface. Descriptions start verbatim-identical; a future change could generate one from the other if drift bites.
- [`-h` previously fell through to "File not found: -h"] → Behavior change for anyone scripting `httptui -h` expecting an error; the new behavior is strictly more useful and matches universal CLI convention.
