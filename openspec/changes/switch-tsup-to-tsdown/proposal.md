# Proposal: switch-tsup-to-tsdown

## Why

tsup is in maintenance mode while tsdown (Rolldown-based, VoidZero-backed) is its actively developed successor with faster builds and a tsup-compatible configuration surface. httptui's build config is small (single ESM CLI entry), making now a low-risk moment to migrate before the config grows.

## What Changes

- Replace `tsup` with `tsdown` as the build tool: delete `tsup.config.ts`, add `tsdown.config.ts`, swap the devDependency, and update the `dev`/`build` npm scripts.
- Move the CLI shebang (`#!/usr/bin/env node`) from the tsup `banner` option into `src/cli.tsx` as its first line; tsdown preserves source shebangs and marks the emitted entry executable.
- **BREAKING (build output internals only)**: `postman-collection` and `string-width` stop being bundled into `dist/cli.js` and become external runtime imports (tsdown externalizes all declared `dependencies` by default). No change for npm-installed users; `dist/cli.js` shrinks.
- Set `fixedExtension: false` so the ESM output remains `dist/cli.js` (tsdown would otherwise emit `dist/cli.mjs`, breaking `bin`/`main`/`exports`).
- Replace the `runtime` spec's "Build target matches minimum runtime" requirement with a tool-agnostic successor, "Build output matches minimum runtime", dropping the scenario that reads `tsup.config.ts` directly and keeping the `dist/cli.js` smoke-test scenario as the observable verification.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `runtime`: the "Build target matches minimum runtime" requirement is removed and re-added as "Build output matches minimum runtime" — same observable behavior (build emits Node 24-compatible JavaScript, verified via `dist/cli.js`), but tool-agnostic and without the scenario that reads `tsup.config.ts`. The remove/add pairing is required because the delta validator forbids dropping a scenario inside a MODIFIED block.

## Impact

- **Files**: `tsup.config.ts` (deleted), `tsdown.config.ts` (new), `package.json` (scripts + devDependencies), `src/cli.tsx` (shebang line), `openspec/specs/runtime/spec.md` (via delta).
- **Dependencies**: `-tsup ^8.0.0`, `+tsdown` pinned to an exact version (0.x line has breaking changes in minor releases).
- **CI**: workflows call `npm run build` and run on Node `24.x`; tsdown requires Node `^22.18.0 || ^24.11.0 || >=26.0.0`, satisfied by current `24.x` resolution. tsdown fails builds on warnings by default (`--fail-on-warn`), a new CI failure mode to triage during migration.
- **Untouched**: tests, README, `tsconfig.json`, publish workflow (other than inheriting the new build).
