## 1. Parser Refactoring

- [x] 1.1 Rename `src/core/postman-env-parser.ts` to `src/core/env-parser.ts`
- [x] 1.2 Rename `parsePostmanEnvironment` function to `parseEnvironmentFile`
- [x] 1.3 Update all imports: `src/cli.tsx` and `test/postman-env-parser.test.ts`
- [x] 1.4 Rename `test/postman-env-parser.test.ts` to `test/env-parser.test.ts`
- [x] 1.5 Update test imports to use `parseEnvironmentFile` from `env-parser`
- [x] 1.6 Ensure all existing tests pass after renaming

## 2. Config Types and Parsing

- [x] 2.1 Add `EnvironmentConfig` type to `src/core/types.ts` with `{ name: string; file: string }`
- [x] 2.2 Add `environments?: EnvironmentConfig[]` to `HttptuiConfig` type
- [x] 2.3 Update `loadConfigFile` in `src/core/config.ts` to parse `environments` array from config
- [x] 2.4 Validate each `environments` entry has `name` and `file` strings
- [x] 2.5 Add tests for config parsing with `environments` array
- [x] 2.6 Ensure existing config tests still pass

## 3. CLI Arguments

- [x] 3.1 Add `--env-name` and `-E` to `VALUE_FLAGS` in `src/args.ts`
- [x] 3.2 Update `parseArgs` to return `envName` alongside existing `envPath`
- [x] 3.3 Add mutual exclusivity validation: reject if both `--env` and `--env-name` are provided
- [x] 3.4 Add tests for `--env-name` parsing, `-E` parsing, and mutual exclusivity
- [x] 3.5 Ensure existing CLI argument tests still pass

## 4. Environment Resolution and Loading

- [x] 4.1 Update `src/cli.tsx` to accept both `envPath` and `envName` from `parseArgs`
- [x] 4.2 Add `resolveEnvironmentFile` function: look up `envName` in config, resolve path using `resolveCertPath` logic
- [x] 4.3 Exit with error if `envName` is provided but name is not found in config
- [x] 4.4 Exit with error if resolved environment file path does not exist
- [x] 4.5 Reuse existing file loading logic for both `--env` and `--env-name` after resolution
- [x] 4.6 Update `loadConfig` call to pass `dirname(filePath)` as before
- [x] 4.7 Ensure `--env` continues to work exactly as before
- [x] 4.8 Add integration tests for `--env-name` loading from global and project config
- [x] 4.9 Add tests for error cases (missing env name, missing file path)

## 5. Existing Behavior Preservation

- [x] 5.1 Verify that `--env` flag works exactly as before for Postman and simplified files
- [x] 5.2 Verify that `R` reload preserves environment variables from both `--env` and `--env-name`
- [x] 5.3 Verify that `o` file load preserves environment variables from both `--env` and `--env-name`
- [x] 5.4 Verify that request details (`d`) show environment variable values
- [x] 5.5 Ensure all existing tests pass without modification

## 6. Cleanup and Verification

- [x] 6.1 Run full test suite and verify all tests pass
- [x] 6.2 Run linter and verify no new errors
- [x] 6.3 Verify TypeScript compilation succeeds
- [x] 6.4 Review code for any leftover references to `postman-env-parser` or `parsePostmanEnvironment`
- [x] 6.5 Update README.md with new CLI flag `--env-name` / `-E` and config `environments` option
