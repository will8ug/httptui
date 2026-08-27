## 1. Argument parsing

- [ ] 1.1 Add `HELP_FLAGS = new Set(['--help', '-h'])` to `src/args.ts`, return `help: boolean` via `.some()`, and skip help flags in the positional-args loop alongside `INSECURE_FLAGS`/`VERSION_FLAGS`
- [ ] 1.2 Update every existing `toEqual` assertion in `test/cli-args.test.ts` to include `help: false`; add cases mirroring the `-v` block: `-h` alone, `--help` alone, `-h`/`--help` before and after a file path, help combined with `--insecure`/`--env`, `--env -h` value-guard (`envPath` undefined, `help` true), and `-h -v` / `--version --help` setting both `help: true` and `version: true`
- [ ] 1.3 Run `npx vitest run test/cli-args.test.ts` and confirm all assertions pass

## 2. Help module and entry point

- [ ] 2.1 Create `src/help.ts` exporting `HELP_TEXT` with the exact content from design.md Decision 4 (usage line, five flag pairs with README wording, `?` hint)
- [ ] 2.2 In `src/cli.tsx`, destructure `help` from `parseArgs`, add a help check before the version check that writes `HELP_TEXT` to stdout and exits 0, and update the no-file `exitWithError` message to the two-line form from design.md Decision 3 (`Usage: httptui <file>` + `Try 'httptui --help' for more information.`)
- [ ] 2.3 Verify manually: `npx tsx src/cli.tsx --help`, `-h`, `--help api.http`, `-h -v` (help printed, no version), `-v -h` (order-independence), and bare invocation (two-line stderr message, non-zero exit)

## 3. Documentation

- [ ] 3.1 Add a `--help`, `-h` row to the README options table with the same description wording as `HELP_TEXT`

## 4. Verification

- [ ] 4.1 Run the full check suite (`npx vitest run`, lint, build) and confirm a clean pass
- [ ] 4.2 Cross-check implemented behavior against `specs/cli-help/spec.md` scenarios and the modified `cli-version` requirement; confirm each scenario is observable in the built CLI
