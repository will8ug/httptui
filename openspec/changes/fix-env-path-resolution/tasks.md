## 1. Resolve paths at load time in `loadConfigFile()`

- [ ] 1.1 In `src/core/config.ts`, update `loadConfigFile(configPath)` to resolve all relative paths to absolute using `dirname(configPath)` as the base: resolve each `file` in `environments` entries via `resolveCertPath(entry.file, baseDir)`, and resolve each `cert`/`key`/`pfx`/`ca` in certificate entries via `resolveCertPath(value, baseDir)`

## 2. Remove `configDir` from types and merge logic

- [ ] 2.1 Remove `configDir?: string` from `HttptuiConfig` in `src/core/types.ts`
- [ ] 2.2 Remove `configDir?: string` from `ExecutorConfig` in `src/core/types.ts`
- [ ] 2.3 Remove `configDir?: string` from `AppState` in `src/core/types.ts`
- [ ] 2.4 Update `loadConfig()` in `src/core/config.ts` to stop setting `configDir` in the return value — remove all `configDir: ...` assignments from the three return paths (global-only, project-only, merged)

## 3. Remove `configDir` from consumers

- [ ] 3.1 Update `cli.tsx` line 88: remove `baseDir` logic, use `resolveCertPath(match.file, '')` since `match.file` is already absolute
- [ ] 3.2 Update `app.tsx` line 117: remove `configDir` lookup — pass `''` (or any string) to `loadCertFiles()` since cert paths are already absolute and `resolveCertPath` returns them as-is
- [ ] 3.3 Update `app.tsx` lines 178-181: remove `configDir` from `newExecutorConfig` in the file-load handler
- [ ] 3.4 Update `reducer.ts`: remove `configDir` from the initial state (line 626) and from the `LOAD_FILE` action handler (line 466)

## 4. Update existing tests

- [ ] 4.1 Update `test/config.test.ts`: remove `configDir` from all expected config objects (~14 assertions). Add new assertions verifying that returned paths are absolute (e.g., cert paths and env file paths are resolved against the correct config directory)

## 5. Add regression tests

- [ ] 5.1 Add a test in `test/config.test.ts`: global config with environments + project config without environments → env `file` paths are resolved relative to global config directory
- [ ] 5.2 Add a test in `test/config.test.ts`: project config with environments → env `file` paths are resolved relative to project config directory
- [ ] 5.3 Add a test in `test/config.test.ts`: global config with certs + project config without certs → cert paths are resolved relative to global config directory
- [ ] 5.4 Add a smoke test in `test/cli-smoke.test.ts`: reproduce the original bug scenario — global config with environments, project config present, `--env-name` resolves correctly

## 6. Verification

- [ ] 6.1 Run `npm test` and confirm all existing and new tests pass
- [ ] 6.2 Run `npm run build` and confirm no type errors
