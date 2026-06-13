## 1. Core Implementation

- [ ] 1.1 Swap the insertion order in `mergeVariables()` (`src/core/variables.ts` lines 27-33): insert environment variables into the Map first, then file variables. This makes file variables win on name collision.
- [ ] 1.2 Run `lsp_diagnostics` on `src/core/variables.ts` to confirm no type errors.

## 2. Test Updates

- [ ] 2.1 Update `test/core/variables.test.ts` line 250: rename test from "environment variables override file variables" to "file variables override environment variables". Flip the assertion on line 261 to expect `https://api.local` (file value) instead of `https://api.dev.com` (env value).
- [ ] 2.2 Run the full test suite (`npm test`) and confirm all tests pass.

## 3. Documentation Updates

- [ ] 3.1 Update `README.md` line 169: change "Environment variables override file-level and collection-level variables of the same name" to "File-level and collection-level variables override environment variables of the same name".
- [ ] 3.2 Update `openspec/specs/variables/spec.md`: flip the "Resolution order" requirement and its scenarios to reflect file vars taking precedence over env vars. Add a scenario for env vars serving as a base layer when no file var exists.
- [ ] 3.3 Update `openspec/specs/environment-files/spec.md`: rename "Environment variables take precedence" requirement to "File variables take precedence over environment variables". Flip all scenarios. Add a scenario for env vars as base layer defaults.
