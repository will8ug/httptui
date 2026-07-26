## 1. tsconfig adjustments

- [ ] 1.1 Remove `"baseUrl": "."` from `tsconfig.json` (deprecated → TS5101 under TS 6.0; `paths` resolves without it).
- [ ] 1.2 Remove `"declaration": true` and `"declarationMap": true` from `tsconfig.json` (no DTS consumer, `tsup.config.ts` has no `dts: true`).
- [ ] 1.3 Add `"types": ["node", "react"]` to `tsconfig.json` `compilerOptions` (compensates for TS 6.0's `types: []` default — `@types/*` no longer auto-included).

## 2. Dependency bump

- [ ] 2.1 Run `npm install --save-dev typescript@^6.0.3` and verify the lockfile resolves `typescript@6.0.3` exactly.
- [ ] 2.2 Run `npm ls typescript` and confirm no other package pins TS to a 5.x version that conflicts.

## 3. CI hardening

- [ ] 3.1 Add `"typecheck": "tsc --noEmit"` to `package.json` scripts.
- [ ] 3.2 Add a `tsc --noEmit` step (or `npm run typecheck`) to `.github/workflows/ci.yml`, gated to run after install and before (or in parallel with) build.

## 4. Verification gates (must all pass before declaring complete)

- [ ] 4.1 **Type check**: `npx tsc --noEmit` exits 0. Investigate every diagnostic as a TS 6.0 behavioral change (not a compiler bug). If a "Cannot find name" diagnostic names an `@types/*` ambient type not in the list, add it to `types` in 1.3 and retry.
- [ ] 4.2 **Lint smoke**: `npm run lint` exits 0 with no internal `typescript-eslint` errors. If `typescript-eslint@8` is incompatible with the TS 6.0 AST (internal error, not a rule failure), bump `typescript-eslint` to the nearest compatible minor and retry.
- [ ] 4.3 **Build**: `npm run build` (tsup) exits 0 and emits `dist/cli.js` with the shebang banner intact.
- [ ] 4.4 **Tests**: `npm test` (vitest) passes with no new failures vs. the pre-upgrade baseline. Pay specific attention to tests that exercise `src/core/reducer.ts` and `src/core/executor.ts` — TS 6.0's "less context-sensitive this-less functions" inference change could subtly drift inferred types.

## 5. Cleanup

- [ ] 5.1 Remove `openspec/changes/upgrade-typescript-6/specs/NO_DELTAS.md` if a downstream archive step objects to non-`spec.md` files in the specs glob; otherwise leave as-is per the precedent note it carries.
- [ ] 5.2 Confirm the change scope note: no `src/` files were modified (none were expected per the design's feature-usage audit).