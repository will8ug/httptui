## 1. CLI Arguments

- [ ] 1.1 Add `--env` / `-e` flag to `src/args.ts`
- [ ] 1.2 Add tests in `test/cli-args.test.ts` for `--env` flag parsing

## 2. Environment File Parser

- [ ] 2.1 Create `src/core/postman-env-parser.ts` with `parsePostmanEnvironment(content: string): FileVariable[]`
- [ ] 2.2 Handle `values` array extraction, skip `enabled: false`, ignore `type`
- [ ] 2.3 Handle edge cases: empty `values`, missing `values`, invalid JSON
- [ ] 2.4 Add tests in `test/postman-env-parser.test.ts` with fixture files

## 3. Variable Resolution Overlay

- [ ] 3.1 Update `resolveVariables()` in `src/core/variables.ts` to accept optional `environmentVariables?: FileVariable[]`
- [ ] 3.2 Implement merge logic: file vars first, then environment vars overlay (same key → env wins)
- [ ] 3.3 Update `resolveFileVariables()` similarly if needed for consistency
- [ ] 3.4 Update `test/variables.test.ts` to cover overlay precedence

## 4. CLI Entry Point

- [ ] 4.1 Update `src/cli.tsx` to parse `--env` path, validate existence, call `parsePostmanEnvironment()`
- [ ] 4.2 Merge environment variables with parsed file/collection variables before passing to `<App>`
- [ ] 4.3 Add tests in `test/cli-smoke.test.ts` for `--env` with valid and invalid files

## 5. App State and Reload

- [ ] 5.1 Add `environmentVariables: FileVariable[]` to `AppState` in `src/core/types.ts`
- [ ] 5.2 Update `createInitialState()` in `src/core/reducer.ts` to accept env vars from `AppProps`
- [ ] 5.3 Update `RELOAD_FILE` action to preserve `environmentVariables` while replacing `variables`
- [ ] 5.4 Update `LOAD_FILE` action to preserve `environmentVariables` while replacing `variables`
- [ ] 5.5 Update `src/app.tsx` to pass env vars through reload and file-load flows

## 6. Integration Tests

- [ ] 6.1 Add fixture: `test/fixtures/postman-environment.json` (valid env file)
- [ ] 6.2 Add fixture: `test/fixtures/postman-environment-disabled.json` (with enabled: false)
- [ ] 6.3 Add integration test verifying `--env` overrides collection variables
- [ ] 6.4 Add integration test verifying `--env` overrides `.http` file variables
- [ ] 6.5 Add integration test verifying reload (`R`) preserves environment

## 7. Documentation

- [ ] 7.1 Update `README.md` with `--env` usage example
- [ ] 7.2 Mention `--env` works for both `.http` and Postman collection files
