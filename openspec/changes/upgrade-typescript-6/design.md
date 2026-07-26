## Context

The codebase is on TypeScript `^5.9.0` with a modern tsconfig: `target: ES2024`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `esModuleInterop: true`. The build pipeline uses `tsup` (esbuild-based — does not invoke `tsc`) and tests run on `vitest` (also esbuild-based). `typescript-eslint@8` is configured with `projectService: true`, meaning it shells out to the installed `typescript` package for type-aware lint rules.

A feature-usage audit of `src/` (24 `.ts` + 11 `.tsx` files) found **zero** usage of features on the TS 6.0 deprecation/breaking list: no `enum`, no `namespace`, no decorators (legacy or stage-3), no parameter properties, no `satisfies`, no `using`, no `abstract class`. Usage is conservative: `import type`, `as const`, type aliases, interfaces, utility types (`Record`, `Partial`, etc.), template-literal types, and a discriminated union (`Action` in `src/core/types.ts`). No `@ts-expect-error` or `@ts-ignore` suppressions.

TS 6.0 (stable Mar 23, 2026; 6.0.3 is the current stable patch, Apr 16, 2026) changes default behaviors and deprecates options that affect this repo's tsconfig:

| Change | TS 5.x | TS 6.0 | Effect on this repo |
|---|---|---|---|
| `strict` default | `false` | `true` | None — already set |
| `module` default | `commonjs` | `esnext` | None — already set |
| `esModuleInterop` | toggleable | always `true` | None — already set |
| `types` default | auto-include all `@types/*` | `[]` (none) | **Breaks** — must add `"types": ["node", "react"]` |
| `baseUrl` | supported | **deprecated → TS5101** | **Warns** — must remove |
| `target: es5` / `moduleResolution: node10` | supported | deprecated | None — not used |

CI (`.github/workflows/ci.yml`) currently runs `npm install` → `npm run build` → `npm test`. **No `tsc --noEmit` step, no `npm run lint` step** — so type drift introduced by a TS bump would not fail CI.

## Goals / Non-Goals

**Goals:**
- Bump `typescript` from `^5.9.0` to `^6.0.3` while keeping build, test, and lint green.
- Adjust `tsconfig.json` for TS 6.0 default changes (remove deprecated `baseUrl`, add explicit `types`).
- Remove stale `declaration`/`declarationMap` tsconfig options — the project ships a CLI binary, no DTS consumer exists, and `tsup.config.ts` has no `dts: true`. They would otherwise force a `baseUrl` workaround for the unmaintained tsup DTS builder (issue #1388).
- Harden CI with a `tsc --noEmit` step so future TS bumps cannot silently introduce type errors that no gate would catch.

**Non-Goals:**
- Migrating from `tsup` to `tsdown` (the TS team's recommended replacement). The current tsup config has no `dts: true`, so the well-known `baseUrl`-injection bug in tsup's DTS builder does not apply. Migrating build tooling is a separate, larger change.
- Adopting any TS 6.0-specific new syntax (`--stableTypeOrdering`, `es2025` lib types, subpath `#/` imports). No driver for these.
- Lock-file hygiene beyond the TypeScript bump. Other dependencies (`@types/node`, `typescript-eslint`, `vitest`) get a bump only if verification gates fail — not proactively.
- Modifying any user-facing runtime behavior — the shipped CLI artifact is identical (esbuild-transpiled by tsup, `tsc` is not in the runtime build path).

## Decisions

### Decision 1: Remove `baseUrl: ".",` rather than silence with `ignoreDeprecations`

**Choice:** Delete the line. TS 6.0 resolves `paths` without it.

**Alternatives considered:**
- Add `"ignoreDeprecations": "6.0"` to suppress `TS5101`. **Rejected** — silences the deprecation rather than addressing it; `ignoreDeprecations` is itself a temporary escape hatch that TS 7.0 removes.

**Rationale:** The deprecation exists because `baseUrl` had ambiguous resolution semantics. `paths` in TS 5.x+ resolves relative to the tsconfig directory automatically. There is no behavioral loss from removing it.

### Decision 2: Add `"types": ["node", "react"]` rather than enumerate all `@types/*`

**Choice:** Explicit minimum list keyed to what `src/` actually uses. `node` (for `process`, `Buffer`, `fs` etc.) and `react` (for JSX runtime's `JSX` namespace).

**Alternatives considered:**
- `"types": []` (disable auto-inclusion entirely, add per-file `/// <reference types="..." />` directives). **Rejected** — verbose, error-prone, fights the toolchain.
- Migrate to `lib` overrides and remove `@types/react`. **Rejected** — out of scope, no driver.

**Rationale:** TS 6.0's `types: []` default is intentional (libraries shouldn't drag in unrelated ambient types). For an app where `node` + React JSX are first-class, explicitly listing the two is the clean, durable choice. The verification gate (`tsc --noEmit`) will catch any missing `@types/*` ambient reference (e.g., if `vitest` globals are used in `src/`, which the audit suggests they are not — `vitest` is test-only and test files are excluded from this tsconfig).

### Decision 3: Drop `declaration: true` and `declarationMap: true`

**Choice:** Remove both flags.

**Alternatives considered:**
- Keep them and rely on tsup's no-`dts:true` to ignore the settings. **Rejected** — leaves stale directives in tsconfig that imply intent the project doesn't have, and would force the tsup #1388 workaround if anyone ever flips `dts: true` on.
- Migrate from tsup to tsdown for DTS emit. **Rejected** — out of scope. No consumer needs `.d.ts` from this CLI.

**Rationale:** `httptui` ships a CLI binary via `"bin": "./dist/cli.js"`. No `exports` map, no library consumers, no `import` surface for downstream TypeScript. Audit confirms `tsup.config.ts` has no `dts: true`. Removing the flags aligns tsconfig with actual emit behavior.

### Decision 4: Add `typecheck` npm script + CI `tsc --noEmit` step

**Choice:** Add `"typecheck": "tsc --noEmit"` to `package.json` scripts and add it as a CI step between install and build (or between build and test).

**Alternatives considered:**
- Add `npm run lint` to CI instead. **Partial** — `typescript-eslint` runs type-aware rules and would catch many type errors, but it's slower and not equivalent to `tsc --noEmit`. Doing both is overkill for this change.
- Add only `tsc --noEmit` to CI, no npm script. **Rejected** — less reusable; the npm script lets devs run the same gate locally.

**Rationale:** The TS 6.0 "less context-sensitive this-less functions" inference change is theoretically capable of subtly drifting inferred types, and future bumps add similar risks. The current CI has no type-check gate at all, meaning "CI green" stopped meaning "type checks" silently. A 30-second `tsc --noEmit` step is the cheapest possible insurance and pays for itself on the next TS bump.

## Risks / Trade-offs

- **`typescript-eslint@8` AST compatibility with TS 6.0** → Mitigation: smoke-test by running `npm run lint` after the bump; the `eslint.config.js` uses `projectService: true` which means the lint run will invoke TS 6.0's language service. If it errors internally, fall back to bumping `typescript-eslint` to a compatible minor before retrying. This is a verification gate before declaring the change complete, not a code modification.
- **The `types: ["node", "react"]` list is incomplete** — if `src/` transitively references an ambient type from another `@types/*` package (e.g., a node sub-module), `tsc --noEmit` will surface a "Cannot find name" error. → Mitigation: verification gate, expand the list if a failure names a specific package.
- **Inference drift from "less context-sensitive this-less functions"** — TS 6.0 stops skipping method-syntax functions that don't use `this`. Could subtly change inferred types in `src/core/reducer.ts` or `src/core/executor.ts`. → Mitigation: run `tsc --noEmit` after bump; investigate any new errors as TS 6.0 behavioral changes, not compiler bugs.
- **Editor/IDE TS version mismatch** — VS Code ships its own bundled TS. Editors will pick up the workspace's `typescript` package once TS 6.0 is installed. → Mitigation: none needed — this is the expected, intended behavior.
- **Rollback** — trivial: revert `package.json` to `typescript@^5.9.0`, revert `tsconfig.json` changes, revert CI step. No data, no migration, no runtime impact to undo.