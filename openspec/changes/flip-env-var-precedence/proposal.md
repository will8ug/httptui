## Why

The current variable precedence (environment file vars override file vars) is counterintuitive. Users expect variables declared directly in their `.http` file or Postman collection to be the most specific source — they're right next to the requests. Environment files should serve as a base layer providing defaults, while file-level variables override them for cases where a specific request needs a different value.

## What Changes

- **BREAKING**: Flip the variable merge order in `mergeVariables()` so that file/collection variables take precedence over environment file variables. When both define the same variable name, the file/collection value wins.
- Update the `variables` spec: the "Resolution order" requirement and its scenarios currently state environment overlay takes precedence — this inverts to file vars taking precedence.
- Update the `environment-files` spec: the "Environment variables take precedence" requirement and its scenarios currently state env overrides file — this inverts to file vars overriding env vars.
- Update the README: the statement "Environment variables override file-level and collection-level variables of the same name" must be reversed.
- Update existing tests that assert environment-wins-over-file behavior to assert file-wins-over-environment.

No changes to config loading (`loadConfig()` shallow merge), CLI flags (`--env`/`--env-name` mutual exclusivity), environment file parsing, or Postman collection variable handling. Postman collection variables are already treated as file variables (same `ParseResult.variables` field) and naturally sit at the highest precedence tier.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `variables`: Resolution order requirement changes — file/collection variables now take precedence over environment file variables instead of the reverse.
- `environment-files`: "Environment variables take precedence" requirement changes — file/collection variables now take precedence over environment file variables.

## Impact

- **Code**: `mergeVariables()` in `src/core/variables.ts` — swap insertion order (env vars first, file vars second).
- **Tests**: Any test asserting environment-wins-over-file precedence must be updated. This includes tests in `variables.test.ts`, `env-parser.test.ts`, and integration tests.
- **Docs**: README "Environment Files" section. Both modified specs (`variables/spec.md`, `environment-files/spec.md`).
- **User-facing behavior**: Users who relied on environment files overriding file variables will see the opposite behavior. This is a deliberate breaking change.
