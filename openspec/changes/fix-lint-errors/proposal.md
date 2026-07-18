## Why

`npm run lint` fails on `main` with 15 errors across 8 files. Because nothing enforces lint (no CI workflow exists), these accumulated silently — and the failure noise now masks new issues: during the `add-response-rendering-tests` verification, lint could not be used as a whole-repo gate and had to be re-scoped manually to the new files. 5 of the 15 errors flag runtime guards that are load-bearing (array/Record access without `noUncheckedIndexedAccess`), so indiscriminate "delete the flagged code" fixes would introduce crashes; each error needs its categorized, verified fix.

## What Changes

- **Keep 5 runtime guards, suppress the false positives** (`no-unnecessary-condition`): `src/app.tsx:251` (env-select option guard), `src/args.ts:27` and `:36` (next-arg bounds guards), `src/core/certificates.ts:25` and `:29` (Record existence checks). Add per-line `eslint-disable` comments with justifications, matching the 9 existing identical disables in `app.tsx`, `reducer.ts`, `parser.ts`, and `wrap.ts`. The guards stay — removing them would crash on out-of-bounds access.
- **Remove 1 dead variable** (`no-unused-vars`): delete unused `totalLines` in `src/components/RequestDetailsView.tsx:121`.
- **Remove 1 redundant assertion** (`no-unnecessary-type-assertion`): drop `as any` in `src/core/openapi-parser.ts:292` (`resolveSchema` already returns `any`).
- **Suppress 2 test env-restore deletes** (`no-dynamic-delete`): per-line `eslint-disable` in `test/core/certificates.test.ts:21` and `test/core/config.test.ts:27`, matching the existing identical disables in `src/core/parser.ts` and `src/core/executor.ts`.
- **Replace 5 non-null assertions in tests** (`no-non-null-assertion`): `test/core/certificates.test.ts` lines 207, 209, 211, 237, 254 — replace `result.cert!.toString()` with `(result.cert as Buffer).toString()` (runtime-identical; both are type-level no-ops).
- **Suppress 1 env-value stringify** (`no-base-to-string`): per-line `eslint-disable` in `src/core/env-parser.ts:46`. Changing `String(value ?? '')` to `JSON.stringify` would alter behavior for malformed env files — out of scope for a zero-behavior-change cleanup.
- No dependency changes. No config changes. No test changes beyond the two test-file edits above. No behavior changes — the full suite (639 tests) must pass unchanged.

## Capabilities

### New Capabilities
<!-- None. Tooling hygiene only — no user-facing capability is introduced. -->

### Modified Capabilities
- `runtime`: Adds a toolchain-hygiene requirement — `npm run lint` SHALL exit with zero errors, with runtime guards preserved via justified per-line disables and dead/redundant code removed. No product-behavior requirements change.

## Impact

- **Modified files** (8): `src/app.tsx`, `src/args.ts`, `src/components/RequestDetailsView.tsx`, `src/core/certificates.ts`, `src/core/env-parser.ts`, `src/core/openapi-parser.ts`, `test/core/certificates.test.ts`, `test/core/config.test.ts` — comment-only or type-level edits, plus two dead-code removals.
- **Runtime behavior**: unchanged. Every edit is a comment addition, a dead-code removal, or a type-level no-op (`as any` → nothing, `!` → `as Buffer`).
- **Verification**: `npm run lint` exits 0; `npm test` passes all 639 tests unchanged; `npm run build` succeeds.
- **Out of scope**: enabling `noUncheckedIndexedAccess` in tsconfig (the root cause of 5 false positives — a large, separate typing change); adding CI lint enforcement; any behavior change.
