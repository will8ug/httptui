# Tasks: switch-tsup-to-tsdown

## 1. Tooling swap

- [ ] 1.1 Remove `tsup` from devDependencies and install `tsdown` pinned to an exact version (no `^`/`~`); verify `package.json` lists the exact tsdown version and no tsup, and `npm install` exits 0
- [ ] 1.2 Delete `tsup.config.ts` and create `tsdown.config.ts` with native options: `entry: ['src/cli.tsx']`, `format: ['esm']`, `target: 'node24'`, `outDir: 'dist'`, `clean: true`, `sourcemap: true`, `fixedExtension: false`, no `banner`, no `deps` overrides; verify no deprecated tsup-compat option names appear in the config
- [ ] 1.3 Update `package.json` scripts: `build` to `tsdown` and `dev` to `tsdown -w`; verify `npm run build` exits 0 with zero warnings (tsdown fails on warnings by default — triage any warning at the source rather than adding `--no-fail-on-warn`)

## 2. Shebang in source

- [ ] 2.1 Add `#!/usr/bin/env node` as the first line of `src/cli.tsx`; verify `npm run typecheck`, `npm run lint`, and `npm test` still pass (the shebang must not break TS parsing or existing tests)

## 3. Build output verification

- [ ] 3.1 Verify `dist/cli.js` (not `.mjs`) exists after `npm run build`, starts with the shebang line, has the executable bit set (`ls -l dist/cli.js`), and `dist/cli.js.map` is emitted
- [ ] 3.2 Verify `postman-collection` and `string-width` are externalized: `dist/cli.js` contains bare `import`/`require` specifiers for them (or does not inline their source), while `react`, `ink`, `@inkjs/ui`, `undici`, `yaml` remain external as before
- [ ] 3.3 Verify watch mode: `npm run dev` rebuilds `dist/cli.js` on a trivial edit to a `src/` file, then stop the watcher and revert the edit
- [ ] 3.4 Run the existing smoke test suite (`npm test`, which includes `test/cli-smoke.test.ts`) and verify `dist/cli.js` executes on Node 24 without syntax errors

## 4. End-to-end CLI check

- [ ] 4.1 `npm link` the package and verify `httptui --version` prints the version, `httptui <sample.http file>` opens the TUI, and a Postman collection file loads (exercising `postman-collection` as an external runtime import); then `npm rm -g @will8ug/httptui` to unlink

## 5. Final validation

- [ ] 5.1 Verify `openspec validate switch-tsup-to-tsdown --type change` passes and no reference to `tsup` remains in code or config (`grep -ri tsup` returns matches only under `openspec/specs/` — updated at archive time — and `openspec/changes/`)
