## Why

httptui fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` when hitting APIs whose TLS certificates are signed by locally-installed root CAs (e.g., corporate proxies, self-signed internal services). VS Code REST Client handles the same requests without error because Electron uses the OS certificate store. Node.js does not use system CAs by default, and the executor currently passes no TLS configuration to undici.

## What Changes

- Add a `--insecure` CLI flag to skip TLS certificate verification for environments where system CA setup is impractical.
- Improve error messaging for TLS failures — surface the specific certificate error and suggest remediation steps (`NODE_EXTRA_CA_CERTS`, `--use-system-ca`, `--insecure`).
- Update README with TLS troubleshooting section.

## Capabilities

### New Capabilities

_(none — this is a fix to existing capabilities)_

### Modified Capabilities

- `executor`: Add TLS configuration support — `--insecure` flag disables certificate verification; better error handling for TLS-related failures with actionable remediation messages.

## Impact

- **Code**: `src/core/executor.ts` (TLS options on undici request), `src/cli.tsx` (parse `--insecure` flag, pass config down), `src/app.tsx` (propagate TLS config to executor).
- **Types**: `src/core/types.ts` — add TLS/executor config type.
- **Tests**: `test/executor.test.ts` — add tests for insecure mode and TLS error messaging.
- **Docs**: `README.md` — TLS troubleshooting section.
- **Dependencies**: None added. Uses undici's existing `Agent` + `connect` options.
