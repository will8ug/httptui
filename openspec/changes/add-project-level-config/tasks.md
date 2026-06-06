## 1. Core Config Changes

- [x] 1.1 Add `loadConfig(projectDir?)` overload in `src/core/config.ts` to accept optional project directory
- [x] 1.2 Implement project config discovery: check for `.httptui.json` in `projectDir` if provided
- [x] 1.3 Implement shallow merge: project config values override global config values at top level
- [x] 1.4 Update `resolveCertPath()` to accept a `baseDir` parameter instead of always using `getConfigDir()`
- [x] 1.5 Ensure `loadConfig` returns correct `configDir` in result so callers know where to resolve relative paths from
- [x] 1.6 Add unit tests for `loadConfig` merge behavior in `test/config.test.ts`

## 2. Execution Flow Changes

- [x] 2.1 Update `cli.tsx` to pass `dirname(filePath)` to `loadConfig()` at startup
- [x] 2.2 Update `src/core/types.ts` to add `configDir` to `ExecutorConfig` or `AppProps`
- [x] 2.3 Update `app.tsx` to re-discover config on `LOAD_FILE` using the new file's directory
- [x] 2.4 Update `app.tsx` `sendSelectedRequest` to pass project config directory to cert path resolution
- [x] 2.5 Ensure `RELOAD_FILE` does not trigger config re-discovery (only file content changes)

## 3. Variables Fix

- [x] 3.1 Update `src/core/variables.ts` to accept a `baseDir` parameter for `$dotenv` resolution
- [x] 3.2 Change `$dotenv` to look for `.env` in `baseDir` first, then fall back to `process.cwd()`
- [x] 3.3 Update `app.tsx` to pass the `.http` file's directory to variable resolution
- [x] 3.4 Update `test/variables.test.ts` to test `$dotenv` resolution from `.http` file's directory

## 4. Documentation

- [x] 4.1 Add `.httptui.json` section to `README.md`
- [x] 4.2 Document precedence rules (project > global)
- [x] 4.3 Document relative path resolution behavior for project vs global config

## 5. Verification

- [x] 5.1 Run all existing tests to ensure no regressions
- [x] 5.2 Run build and verify clean output
- [x] 5.3 Run LSP diagnostics on changed files
