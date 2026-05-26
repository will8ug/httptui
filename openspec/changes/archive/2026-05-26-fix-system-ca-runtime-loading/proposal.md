## Why

The `process.env.NODE_USE_SYSTEM_CA ??= "1"` banner added in the previous change does not work: Node.js reads `NODE_USE_SYSTEM_CA` during process initialization, before any user code runs. Setting it at runtime is too late — the TLS subsystem is already initialized with bundled CAs only. Users behind corporate proxies still get `unable to verify the first certificate` errors. Node.js 24 provides runtime APIs (`tls.getCACertificates('system')` and `tls.setDefaultCACertificates()`) that load system CA certificates programmatically, which is the correct approach.

## What Changes

- Remove `process.env.NODE_USE_SYSTEM_CA ??= "1";` from the tsup banner in `tsup.config.ts`, reverting to the plain `#!/usr/bin/env node` shebang.
- Add `tls.setDefaultCACertificates(tls.getCACertificates('system'))` to `src/cli.tsx`, called early in the startup path before any HTTP requests are made.
- Update `openspec/specs/system-ca/spec.md` to reflect the programmatic API approach instead of the env var/banner approach.
- Update `README.md` TLS Troubleshooting section: remove `NODE_USE_SYSTEM_CA=0` opt-out (no longer applicable), document that system CAs are loaded programmatically.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `system-ca`: Mechanism for loading system CA certificates changes from `NODE_USE_SYSTEM_CA` env var (set in tsup banner) to programmatic `tls.setDefaultCACertificates()` API call. Opt-out mechanism changes accordingly.

## Impact

- **tsup.config.ts** — banner reverted to plain shebang; the env var line is removed.
- **src/cli.tsx** — adds a `tls.setDefaultCACertificates(tls.getCACertificates('system'))` call at startup.
- **openspec/specs/system-ca/spec.md** — scenarios updated to reflect programmatic loading.
- **README.md** — TLS Troubleshooting section updated; `NODE_USE_SYSTEM_CA=0` opt-out removed.
- **No new dependencies** — uses built-in Node.js 24 `node:tls` APIs.
- **No breaking changes for users** — the behavior from their perspective is the same (system CAs loaded by default), it just actually works now.
