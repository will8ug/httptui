## 1. tsconfig adjustments

- [x] 1.1 Remove `"baseUrl": "."` from `tsconfig.json` (deprecated → TS5101 under TS 6.0; `paths` resolves without it).
- [x] 1.2 Remove `"declaration": true` and `"declarationMap": true` from `tsconfig.json` (no DTS consumer, `tsup.config.ts` has no `dts: true`).
- [x] 1.3 Add `"types": ["node", "react"]` to `tsconfig.json` `compilerOptions` (compensates for TS 6.0's `types: []` default — `@types/*` no longer auto-included).

## 2. Dependency bump

- [x] 2.1 Run `npm install --save-dev typescript@^6.0.3` and verify the lockfile resolves `typescript@6.0.3` exactly.
- [x] 2.2 Run `npm ls typescript` and confirm no other package pins TS to a 5.x version that conflicts.

## 3. CI hardening

- [x] 3.1 Add `"typecheck": "tsc --noEmit"` to `package.json` scripts.
- [x] 3.2 Add a `tsc --noEmit` step (or `npm run typecheck`) to `.github/workflows/ci.yml`, gated to run after install and before (or in parallel with) build.

## 4. Verification gates (must all pass before declaring complete)

- [x] 4.1 **Type check**: `npx tsc --noEmit` exits 0. Investigate every diagnostic as a TS 6.0 behavioral change (not a compiler bug). If a "Cannot find name" diagnostic names an `@types/*` ambient type not in the list, add it to `types` in 1.3 and retry.
- [x] 4.2 **Lint smoke**: `npm run lint` exits 0 with no internal `typescript-eslint` errors. If `typescript-eslint@8` is incompatible with the TS 6.0 AST (internal error, not a rule failure), bump `typescript-eslint` to the nearest compatible minor and retry. _(Note: one pre-existing lint failure in `test/core/response-layout.test.ts:229` — `no-non-null-assertion` — verified present on TS 5.9 baseline via `git stash`. Not a TS 6.0 AST incompatibility; `typescript-eslint@8.59.0` parsed TS 6.0 cleanly.)_
- [x] 4.3 **Build**: `npm run build` (tsup) exits 0 and emits `dist/cli.js` with the shebang banner intact.
- [x] 4.4 **Tests**: `npm test` (vitest) passes with no new failures vs. the pre-upgrade baseline. Pay specific attention to tests that exercise `src/core/reducer.ts` and `src/core/executor.ts` — TS 6.0's "less context-sensitive this-less functions" inference change could subtly drift inferred types. _(Note: an initial run had 2 flakes in `test/cli-smoke.test.ts` due to the suite's tight 2s `runCli` spawn timeout under parallel-load pressure; isolated rerun passes 8/8, full-suite rerun passes 704/704, manual CLI invocation confirms correct behavior — pre-existing flakiness, not caused by the bump.)_

## 5. Cleanup

- [x] 5.1 Remove `openspec/changes/upgrade-typescript-6/specs/NO_DELTAS.md` if a downstream archive step objects to non-`spec.md` files in the specs glob; otherwise leave as-is per the precedent note it carries. _(Note: `openspec validate` reports "no deltas found" — but objects to delta content, not the file name. Per task instruction, NO_DELTAS.md is kept as the precedent note. For archive, the built-in escape hatch `openspec archive --skip-specs` is documented as "useful for infrastructure, tooling, or doc-only changes" — that's our path.)_
- [x] 5.2 Confirm the change scope note: no `src/` files were modified (none were expected per the design's feature-usage audit). _(Confirmed via `git status --short`: only 4 files modified — `.github/workflows/ci.yml`, `package.json`, `tsconfig.json`, `openspec/changes/upgrade-typescript-6/tasks.md`. Zero `src/` changes, matching the design's feature-usage audit prediction.)_