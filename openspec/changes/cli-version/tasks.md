## 1. Version source module

- [ ] 1.1 Create `src/version.ts` exporting the `version` field of `package.json` via static JSON import (per design.md Decision 1)
- [ ] 1.2 Unit-test `src/version.ts` in `test/version.test.ts`: the exported string equals the `version` field of the repo's `package.json` (read the JSON in the test — this verifies the import resolves in vitest's unbundled mode)

## 2. Flag parsing

- [ ] 2.1 Extend `parseArgs` in `src/args.ts`: add `VERSION_FLAGS = new Set(['--version', '-v'])`, parse to a `version: boolean` return field, skip the flags so they never land in `positionalArgs` (design.md Decision 2)
- [ ] 2.2 Extend the existing `test/utils/args.test.ts` (create if absent): `-v` and `--version` each set `version: true` and leave `filePath` undefined; `-v file.http` sets `version: true` with `filePath: 'file.http'`; no flags leaves `version: false`; existing flag behaviors (`--insecure`, `--env`, `--env-name`) unchanged

## 3. CLI early exit

- [ ] 3.1 In `src/cli.tsx`, import the released version from `./version` and add the early exit immediately after `parseArgs` and before the `if (!filePath)` usage guard: print the bare version string to stdout via `console.log` and `process.exit(0)` (design.md Decision 3 pseudocode — follow literally)
- [ ] 3.2 Verify manually: `npm run build && node dist/cli.js --version` prints the package.json version and exits 0; `node dist/cli.js -v` same; `node dist/cli.js` still prints the usage error; `node dist/cli.js path/to/api.http` still launches the TUI. Confirm the version literal is inlined in `dist/cli.js` (grep the version string)

## 4. Guardrails and docs

- [ ] 4.1 Run `npm run typecheck`, `npm run typecheck:test`, `npm run lint`, and `npm test` — all green
- [ ] 4.2 Add a `--version`, `-v` row to the README Options table (`Print the current version and exit`)
