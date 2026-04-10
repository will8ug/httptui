## 1. Types & Config

- [ ] 1.1 Add `ExecutorConfig` interface to `src/core/types.ts` with `insecure: boolean` field
- [ ] 1.2 Add `insecure` field to `AppState` interface so TUI components can read it
- [ ] 1.3 Update `App` component props to accept `ExecutorConfig`

## 2. Executor TLS Support

- [ ] 2.1 Update `executeRequest` signature to accept optional `ExecutorConfig` parameter
- [ ] 2.2 When `insecure: true`, create undici `Agent` with `connect: { rejectUnauthorized: false }` and pass as `dispatcher`
- [ ] 2.3 Add TLS error code detection — map known codes (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `DEPTH_ZERO_SELF_SIGNED_CERT`, `SELF_SIGNED_CERT_IN_CHAIN`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID`) to remediation hints
- [ ] 2.4 Update `toRequestError` to append TLS hints when a TLS error code is detected

## 3. CLI Argument Parsing

- [ ] 3.1 Parse `--insecure` and `-k` flags from `process.argv` in `src/cli.tsx`
- [ ] 3.2 Strip recognized flags from argv before extracting file path (support flag before or after file path)
- [ ] 3.3 Pass parsed `ExecutorConfig` to `App` component

## 4. TUI Integration

- [ ] 4.1 Thread `ExecutorConfig` from `App` props through to `executeRequest` calls in `app.tsx`
- [ ] 4.2 Show "INSECURE" indicator in `StatusBar` when insecure mode is active

## 5. Tests

- [ ] 5.1 Add executor tests for TLS error message enhancement (mock TLS error codes, verify hints are appended)
- [ ] 5.2 Add executor tests verifying non-TLS errors are not modified
- [ ] 5.3 Add CLI argument parsing tests (--insecure, -k, flag position variations)

## 6. Documentation

- [ ] 6.1 Add TLS troubleshooting section to README (NODE_EXTRA_CA_CERTS, --use-system-ca, --insecure)
- [ ] 6.2 Update Usage section with --insecure flag
- [ ] 6.3 Update keyboard shortcuts table if StatusBar changes affect help text
