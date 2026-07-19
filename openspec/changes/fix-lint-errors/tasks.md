## 1. Source Fixes — Preserve Runtime Guards with Justified Disables

- [x] 1.1 In `src/app.tsx` (line 251), add `// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds env option access` directly above `if (!option) {`. Do not modify the guard or any surrounding code.
- [x] 1.2 In `src/args.ts` (line 27 and line 36), add `// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for missing next argument` directly above each `if (nextArg !== undefined && !nextArg.startsWith('-')) {`. Do not modify the guards.
- [x] 1.3 In `src/core/certificates.ts` (line 25 and line 29), add `// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record lookup; key may not exist at runtime` directly above `if (certificates[hostPortKey]) {` and `if (certificates[hostname]) {`. Do not modify the guards.

## 2. Source Fixes — Remove Dead and Redundant Code

- [x] 2.1 In `src/components/RequestDetailsView.tsx` (line 121), delete the unused line `const totalLines = allLines.length;`. Do not touch anything else in the file.
- [x] 2.2 In `src/core/openapi-parser.ts` (line 292), change `const prop = resolveSchema(propSchema, doc) as any;` to `const prop = resolveSchema(propSchema, doc);` (remove only the redundant `as any`; `resolveSchema` already returns `any`).
- [x] 2.3 In `src/core/env-parser.ts` (line 46), add `// eslint-disable-next-line @typescript-eslint/no-base-to-string -- non-string env values only occur in malformed env files; String() fallback is intentional` directly above the `const valueStr = ...` line. Do not change the stringify logic.

## 3. Test Fixes

- [x] 3.1 In `test/core/certificates.test.ts` (line 21), add `// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- env var key is known from saveEnv calls` directly above `delete process.env[key];`.
- [x] 3.2 In `test/core/certificates.test.ts`, replace the 5 non-null assertions with type-level-equivalent casts: line 207 `result.cert!.toString()` → `(result.cert as Buffer).toString()`, line 209 `result.key!.toString()` → `(result.key as Buffer).toString()`, line 211 `result.ca!.toString()` → `(result.ca as Buffer).toString()`, line 237 `result.ca!.toString()` → `(result.ca as Buffer).toString()`, line 254 `result.pfx!.toString()` → `(result.pfx as Buffer).toString()`. Do not modify the preceding `toBeInstanceOf(Buffer)` assertions or any other test logic.
- [x] 3.3 In `test/core/config.test.ts` (line 27), add `// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- env var key is known from ENV_KEYS` directly above `delete process.env[key];`.

## 4. Verification

- [x] 4.1 Run `npm run lint` and confirm it exits 0 with zero errors and zero warnings.
- [x] 4.2 Run `npm test` and confirm all 639 tests pass unchanged.
- [x] 4.3 Run `npm run build` and confirm it succeeds.
- [x] 4.4 Run `git diff --stat` and confirm only the 8 listed files changed (`src/app.tsx`, `src/args.ts`, `src/components/RequestDetailsView.tsx`, `src/core/certificates.ts`, `src/core/env-parser.ts`, `src/core/openapi-parser.ts`, `test/core/certificates.test.ts`, `test/core/config.test.ts`), and review the diff to confirm every edit is a comment addition, a dead-code removal, or a type-level no-op.
