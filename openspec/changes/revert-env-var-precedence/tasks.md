## 1. Core Implementation

- [x] 1.1 Swap the insertion order in `mergeVariables()` (`src/core/variables.ts` lines 27-33): insert file variables into the Map first, then environment variables. This makes environment variables win on name collision.
- [x] 1.2 Run `lsp_diagnostics` on `src/core/variables.ts` to confirm no type errors.

## 2. Test Updates

- [x] 2.1 Update `test/core/variables.test.ts` line 250: rename test from "file variables override environment variables" to "environment variables override file variables". Flip the assertion on line 261 to expect `https://api.dev.com` (env value) instead of `https://api.local` (file value).
- [x] 2.2 Update `test/core/env-switcher.test.ts` line 232: rename test from "preserves file-variable precedence after switch" to "preserves environment-variable precedence after switch". Flip the assertion on line 247 to expect `https://api.dev.com` (env value) instead of `https://api.local` (file value).
- [x] 2.3 Run the full test suite (`npm test`) and confirm all tests pass.

## 3. Documentation Updates

- [x] 3.1 Update `README.md` line 170: change "File-level and collection-level variables override environment variables of the same name" to "Environment variables override file-level and collection-level variables of the same name".
- [x] 3.2 Update the Purpose section in `openspec/specs/runtime-environment-switching/spec.md` (line 5): change "with file-level variables taking precedence" to "with environment variables taking precedence". This purpose line is not a Requirement, so it must be updated directly on the main spec during the apply step.

## 4. Spec Sync

- [x] 4.1 Run `openspec sync-specs revert-env-var-precedence` to merge the three MODIFIED Requirement deltas (`variables`, `environment-files`, `runtime-environment-switching`) into `openspec/specs/`. The sync step overwrites the main spec files with the merged content.
- [x] 4.2 Re-read each of the three updated main spec files to confirm the precedence language was updated correctly and no other content was inadvertently changed.

## 5. Validation

- [x] 5.1 Run `openspec validate revert-env-var-precedence --strict` and confirm it passes.
- [x] 5.2 Run `npm run lint` and `npm test` and confirm exit code 0 with no failures.
- [x] 5.3 Run `lsp_diagnostics` on all changed source files (`src/core/variables.ts`, the two test files) to confirm no type errors.
