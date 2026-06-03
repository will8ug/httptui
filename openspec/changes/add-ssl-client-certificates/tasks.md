## 1. Types and Data Models

- [ ] 1.1 Add `CertEntry` and `HttptuiConfig` types to `src/core/types.ts`, including `cert`, `key`, `pfx`, `passphrase`, and `ca` string fields
- [ ] 1.2 Extend `ExecutorConfig` interface in `src/core/types.ts` with optional `certificates: Record<string, CertEntry>` field

## 2. Config Loading (`global-config`)

- [ ] 2.1 Create `src/core/config.ts` with `getConfigDir()` function implementing the XDG/APPDATA priority chain (HTTP_TUI_CONFIG → XDG_CONFIG_HOME → APPDATA → ~/.config/httptui)
- [ ] 2.2 Implement `loadConfig()` in `src/core/config.ts` that reads `config.json`, parses JSON, and returns `HttptuiConfig | null`
- [ ] 2.3 Implement config validation: cert+key pairing, pfx/cert+key mutual exclusion, at-least-one-field rule — emit warnings to stderr for violations and skip invalid entries
- [ ] 2.4 Handle malformed JSON: emit stderr error, return null config
- [ ] 2.5 Handle missing config file: return null silently

## 3. Path Resolution

- [ ] 3.1 Implement `resolveCertPath(inputPath: string, configDir: string): string` in `src/core/config.ts`: tilde expansion → absolute check → relative-to-config-dir resolution
- [ ] 3.2 Verify path resolution works correctly on Windows (backslash and forward slash separators, drive letters)

## 4. Certificate Matching (`client-certificates`)

- [ ] 4.1 Create `src/core/certificates.ts` with `matchCertificate(url: string, certificates: Record<string, CertEntry>): CertEntry | undefined`
- [ ] 4.2 Implement host:port extraction from URL (handle default ports: 443 for https, 80 for http)
- [ ] 4.3 Implement matching priority: exact host:port → exact host → wildcard (longest suffix wins) → none
- [ ] 4.4 Implement HTTP-only bypass: if URL scheme is `http:` (not `https:`), return undefined regardless of match

## 5. Passphrase Resolution

- [ ] 5.1 Implement `resolvePassphrase(passphrase: string, hostname: string): string` in `src/core/certificates.ts`: strip leading `$`, look up `process.env`, return value or throw clear error naming the missing variable and host
- [ ] 5.2 If passphrase does not start with `$`, use as literal string

## 6. Certificate File Loading

- [ ] 6.1 Implement `loadCertFiles(entry: CertEntry, configDir: string, hostname: string): { cert?: Buffer, key?: Buffer, pfx?: Buffer, passphrase?: string, ca?: Buffer }` in `src/core/certificates.ts`
- [ ] 6.2 Each file is read via `fs.readFileSync` at call time; throw a clear error naming the missing file path and host if the file does not exist

## 7. Executor Integration

- [ ] 7.1 Update `executeRequest()` in `src/core/executor.ts` to accept a `certConfig` parameter (resolved cert buffers)
- [ ] 7.2 Update the undici `Agent` construction: spread `certConfig` fields into `connect`, alongside the existing `rejectUnauthorized` logic
- [ ] 7.3 When no cert match, preserve existing behavior (no dispatcher if secure, `rejectUnauthorized: false` only if insecure)

## 8. CLI and App Wiring

- [ ] 8.1 Update `src/cli.tsx`: call `loadConfig()` before rendering `<App>`, pass `config?.certificates` into `executorConfig`
- [ ] 8.2 Update `src/app.tsx`: in `sendSelectedRequest`, call `matchCertificate(request.url, executorConfig.certificates)` and then `loadCertFiles(...)`, thread the result into `executeRequest`
- [ ] 8.3 Pass cert loading errors (missing env var, missing file) through the existing `REQUEST_ERROR` dispatch flow so they display in the response panel

## 9. Tests

- [ ] 9.1 Write unit tests for `getConfigDir()` covering all four priority tiers and platform differences (mock `process.platform` and env vars)
- [ ] 9.2 Write unit tests for `loadConfig()`: valid config, malformed JSON, missing file, validation warnings
- [ ] 9.3 Write unit tests for `resolveCertPath()`: tilde, absolute, relative paths on both POSIX and Windows
- [ ] 9.4 Write unit tests for `matchCertificate()`: exact host:port, exact host, wildcard, longest-wildcard-wins, HTTP bypass, no match
- [ ] 9.5 Write unit tests for `resolvePassphrase()`: env var present, env var missing, literal (no `$` prefix)
- [ ] 9.6 Write unit tests for `loadCertFiles()`: all files found, file missing (clear error), ca-only entry

## 10. Documentation

- [ ] 10.1 Add a "Client Certificates" section to `README.md` explaining the config file location, schema, and giving a PEM and PFX example
- [ ] 10.2 Document the `$ENV` passphrase convention and why plaintext passphrases are discouraged
