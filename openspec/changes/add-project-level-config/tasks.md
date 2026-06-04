## 1. Core Config Changes

- [ ] 1.1 Add `loadConfig(projectDir?)` overload in `src/core/config.ts` to accept optional project directory
- [ ] 1.2 Implement project config discovery: check for `.httptui.json` in `projectDir` if provided
- [ ] 1.3 Implement shallow merge: project config values override global config values at top level
- [ ] 1.4 Update `resolveCertPath()` to accept a `baseDir` parameter instead of always using `getConfigDir()`
- [ ] 1.5 Ensure `loadConfig` returns correct `configDir` in result so callers know where to resolve relative paths from
- [ ] 1.6 Add unit tests for `loadConfig` merge behavior in `test/config.test.ts`

## 2. Execution Flow Changes

- [ ] 2.1 Update `cli.tsx` to pass `dirname(filePath)` to `loadConfig()` at startup
- [ ] 2.2 Update `src/core/types.ts` to add `configDir` to `ExecutorConfig` or `AppProps`
- [ ] 2.3 Update `app.tsx` to re-discover config on `LOAD_FILE` using the new file's directory
- [ ] 2.4 Update `app.tsx` `sendSelectedRequest` to pass project config directory to cert path resolution
- [ ] 2.5 Ensure `RELOAD_FILE` does not trigger config re-discovery (only file content changes)

## 3. Variables Fix

- [ ] 3.1 Update `src/core/variables.ts` to accept a `baseDir` parameter for `$dotenv` resolution
- [ ] 3.2 Change `$dotenv` to look for `.env` in `baseDir` first, then fall back to `process.cwd()`
- [ ] 3.3 Update `app.tsx` to pass the `.http` file's directory to variable resolution
- [ ] 3.4 Update `test/variables.test.ts` to test `$dotenv` resolution from `.http` file's directory

## 4. Documentation

- [ ] 4.1 Add `.httptui.json` section to `README.md`
- [ ] 4.2 Document precedence rules (project > global)
- [ ] 4.3 Document relative path resolution behavior for project vs global config

## 5. Verification

- [ ] 5.1 Run all existing tests to ensure no regressions
- [ ] 5.2 Run build and verify clean output
- [ ] 5.3 Run LSP diagnostics on changed files
