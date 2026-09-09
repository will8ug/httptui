# Design: switch-tsup-to-tsdown

## Context

See proposal.md — Why. Current state shaping the approach:

- `tsup.config.ts` is 14 lines: single ESM entry `src/cli.tsx`, `target: node24`, `outDir: dist`, `clean`, `sourcemap`, shebang injected via `banner.js`, and an explicit `external` list of 5 of the 7 runtime dependencies (`postman-collection` and `string-width` are currently bundled).
- `package.json` points `bin`/`main`/`exports` at `./dist/cli.js` and declares `"type": "module"`, `engines.node: ">=24"`.
- CI and publish workflows run `npm run build` on Node `24.x`.
- tsdown (v0.23.x at time of writing) differs from tsup in defaults that matter here: `fixedExtension: true` on node platform (ESM emits `.mjs`), all `dependencies` externalized, `--fail-on-warn` on by default, shebang preserved from source (never injected), and its own runtime requirement of Node `^22.18.0 || ^24.11.0 || >=26.0.0`.

## Goals / Non-Goals

**Goals:**
- `npm run build` and `npm run dev` (watch) behave equivalently for consumers: `dist/cli.js` remains the executable ESM CLI entry with shebang, sourcemaps, and Node 24 target.
- Config written in tsdown-native options (no deprecated tsup-compat names).

**Non-Goals:**
- No dual CJS/ESM output; the package stays ESM-only.
- No dts generation (package publishes no types).
- No change to what users install or how `bin` resolution works.

## Decisions

1. **Direct native config, skip the `tsdown-migrate` codemod and its two-stage 0.22 → 0.23 path.** The codemod exists to translate configs using deprecated tsup option names; ours is 14 lines and fully expressible in native options (`entry`, `format`, `target`, `outDir`, `clean`, `sourcemap`, `fixedExtension`). Writing `tsdown.config.ts` by hand is smaller and avoids installing an intermediate tsdown version.

2. **`fixedExtension: false` to preserve `dist/cli.js`.** With the node-platform default (`true`), ESM output would be `dist/cli.mjs`, breaking `bin`/`main`/`exports` and the smoke test. With `false` and `"type": "module"`, tsdown emits `.js` — identical to today. Alternative considered: adopt `.mjs` and update `package.json` paths; rejected as needless churn with zero user benefit.

3. **Shebang moves into source (`src/cli.tsx` line 1) instead of a `banner` option.** tsdown's shebang plugin preserves a source shebang in the entry chunk and `chmod 0755` the output — strictly better than tsup's banner (which does not set the executable bit). Alternative: keep `banner: '#!/usr/bin/env node'`; rejected because the source shebang is tsdown-idiomatic and self-documenting.

4. **Accept tsdown's default externalization of all `dependencies`.** `postman-collection` and `string-width` stop being bundled. They are declared dependencies, so npm-installed users are unaffected; `dist/cli.js` shrinks and dependency updates no longer require a rebuild/republish. No `deps.alwaysBundle` override. The former explicit `external` list is dropped entirely — it is a subset of the new default.

5. **Pin `tsdown` to an exact version in devDependencies.** The 0.x line ships breaking changes in minor releases (0.23 removed deprecated tsup-compat options). Bumps become deliberate, release-notes-reviewed events.

6. **Keep `target: 'node24'` explicit** rather than relying on tsdown's derivation from `engines.node`. Same value either way, but explicit matches the spec requirement's intent and survives `engines` edits.

7. **Spec replaced tool-agnostically via REMOVED + ADDED under a new name** (see specs delta): the successor requirement "Build output matches minimum runtime" states only the observable behavior (Node 24-compatible output, `dist/cli.js` runs), dropping the scenario that read `tsup.config.ts` as self-documenting tooling — consistent with the repo's precedent of removing tooling-shaped spec content (`eslint-config` spec deletion). Mechanism note: the delta validator rejects a MODIFIED block that omits an existing scenario and rejects a same-name REMOVED+ADDED pair, so removing the config-reading scenario requires retiring the old requirement name and adding the successor under a new name.

## Risks / Trade-offs

- [`--fail-on-warn` default turns build warnings into CI failures] → Run the first builds locally; triage any warnings (most likely candidates: interop notices from `postman-collection`'s CJS graph). Add `--no-fail-on-warn` only if a warning proves unfixable, and record why.
- [tsdown requires Node `>=24.11` within the 24 line; contributors on early Node 24.x patch releases cannot build] → CI uses `24.x` (resolves to latest, satisfied). Document nothing for now; a contributor hitting it gets a clear engine error from npm.
- [0.x API churn on future bumps] → exact pin (Decision 5); read release notes before bumping.
- [`postman-collection`/`string-width` now resolve at runtime from `node_modules` instead of the bundle] → Smoke-test the linked CLI (`httptui --version`, load a `.http` file, and a Postman collection to exercise `postman-collection` as an external import) before publishing.
- [TS config loading: `tsdown.config.ts` requires Node native TS support or a loader] → Node `>=24.11` (already required by tsdown itself) loads TS config natively; no extra dependency.

## Migration Plan

Single-commit swap: add `tsdown.config.ts` + shebang + package.json changes, delete `tsup.config.ts`, verify build/watch/smoke locally, then let CI confirm. Rollback is `git revert` — the tsup config is fully reconstructed by the revert with no state to migrate.
