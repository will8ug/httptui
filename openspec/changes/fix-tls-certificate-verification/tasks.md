## 1. Types & Config

- [x] 1.1 Add `ExecutorConfig` interface to `src/core/types.ts` with `insecure: boolean` field
- [x] 1.2 Add `insecure` field to `AppState` interface so TUI components can read it
- [x] 1.3 Update `App` component props to accept `ExecutorConfig`

## 2. Executor TLS Support

- [x] 2.1 Update `executeRequest` signature to accept optional `ExecutorConfig` parameter
- [x] 2.2 When `insecure: true`, create undici `Agent` with `connect: { rejectUnauthorized: false }` and pass as `dispatcher`
- [x] 2.3 Add TLS error code detection — map known codes (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `DEPTH_ZERO_SELF_SIGNED_CERT`, `SELF_SIGNED_CERT_IN_CHAIN`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID`) to remediation hints
- [x] 2.4 Update `toRequestError` to append TLS hints when a TLS error code is detected

## 3. CLI Argument Parsing

- [x] 3.1 Parse `--insecure` and `-k` flags from `process.argv` in `src/cli.tsx`
- [x] 3.2 Strip recognized flags from argv before extracting file path (support flag before or after file path)
- [x] 3.3 Pass parsed `ExecutorConfig` to `App` component

## 4. TUI Integration

- [x] 4.1 Thread `ExecutorConfig` from `App` props through to `executeRequest` calls in `app.tsx`
- [x] 4.2 Show "INSECURE" indicator in `StatusBar` when insecure mode is active

## 5. Tests

- [x] 5.1 Add executor tests for TLS error message enhancement (mock TLS error codes, verify hints are appended)
- [x] 5.2 Add executor tests verifying non-TLS errors are not modified
- [x] 5.3 Add CLI argument parsing tests (--insecure, -k, flag position variations)

## 6. Documentation

- [x] 6.1 Add TLS troubleshooting section to README (NODE_EXTRA_CA_CERTS, --use-system-ca, --insecure)
- [x] 6.2 Update Usage section with --insecure flag
- [x] 6.3 Update keyboard shortcuts table if StatusBar changes affect help text (no changes needed — INSECURE is informational, not a shortcut)
