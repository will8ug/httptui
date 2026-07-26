## Why

TypeScript 5.9.x is the last minor of the 5.x line; 6.0 ships breaking defaults and deprecations that this repo is well-positioned to absorb, but cannot stay on indefinitely without accumulating drift from upstream `lib.d.ts` and `typescript-eslint` support. The codebase already uses modern tsconfig settings (`strict`, `module: ESNext`, `moduleResolution: bundler`, `target: ES2024`) and no deprecated language features (no enums, namespaces, decorators, parameter properties), making the upgrade low-risk hygiene work rather than a refactor.

## What Changes

- Bump `typescript` devDependency from `^5.9.0` to `^6.0.3`.
- Remove deprecated `"baseUrl": "."` from `tsconfig.json` — emits `TS5101` under TS 6.0; `paths` resolves without it.
- Compensate for the TS 6.0 default change (`types` no longer auto-includes all `@types/*`): add `"types": ["node", "react"]` to `tsconfig.json`.
- Drop stale `"declaration": true` and `"declarationMap": true` from `tsconfig.json` — the project ships a CLI binary, no DTS consumer exists, and tsup does not emit declarations (`tsup.config.ts` has no `dts: true`). Keeping them is dead weight that would also force a workaround for [tsup issue #1388](https://github.com/egoist/tsup/issues/1388) if DTS were ever enabled.
- **Hardening (in-scope bonus)**: add a `typecheck` npm script and a `tsc --noEmit` step to CI (`/.github/workflows/ci.yml`). CI currently runs build + test only — no type-check or lint gate — so a future TS major bump could silently introduce type errors no CI step would catch.
- Verify `typescript-eslint@8` compatibility with the TS 6.0 AST as a smoke gate before declaring done.

No `src/` code changes are expected. A feature-usage audit found zero usage of features on the TS 6.0 deprecation list.

## Capabilities

### New Capabilities

(none — this is a tooling/dependency change only, no new user-facing capability is introduced)

### Modified Capabilities

(none — no spec-level behavior changes. This is internal tooling; per `AGENTS.md`, specs describe user-facing system capabilities and observable behavior, not build infrastructure. No `openspec/specs/` capability has its requirements altered by changing the TypeScript version.)

## Impact

- **`package.json`**: `typescript` version bump; new `typecheck` script.
- **`tsconfig.json`**: remove `baseUrl`, `declaration`, `declarationMap`; add `types: ["node", "react"]`.
- **`.github/workflows/ci.yml`**: add `tsc --noEmit` step.
- **Dev tooling** (verification gates, not changes): `typescript-eslint@8` AST compatibility with TS 6.0 must be smoke-tested via `npm run lint`; `@types/node` / `@types/react` versions may need a minor bump if type resolution fails under the new `types` default.
- **No runtime impact** — `tsup` and `vitest` both transform TypeScript via esbuild, not `tsc`, so the shipped artifact is unaffected by the compiler version.