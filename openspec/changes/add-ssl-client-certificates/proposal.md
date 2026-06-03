## Why

httptui currently supports server-side TLS trust (system CA loading, `--insecure`, `NODE_EXTRA_CA_CERTS`) but has no way to configure **client-side** TLS authentication. Many internal APIs, corporate microservices, and production endpoints require mutual TLS (mTLS) — presenting a client certificate during the TLS handshake. Without this feature, httptui cannot be used against mTLS-protected endpoints, limiting its usefulness for enterprise and internal-API workflows.

## What Changes

- Introduces a global configuration file at `~/.config/httptui/config.json` (XDG-aware, with Windows `%APPDATA%\httptui\config.json` support).
- The config file maps hostnames (and optional ports) to client certificate credentials: PEM (`cert` + `key`), PKCS#12 bundles (`pfx`), and custom CAs (`ca`).
- Passphrases for encrypted keys/PFX files are referenced via `$ENVIRONMENT_VARIABLE` syntax only — never stored as plaintext in the config.
- Certificate matching uses priority-based host resolution: exact `host:port` > exact `host` > wildcard (`*.domain`) > no match.
- Certificate files are read **lazily** on request, not at startup, so a missing cert file for an unused host does not prevent httptui from starting.
- The executor's undici `Agent` is configured with matched credentials via the `connect` option, which passes directly through to Node.js `tls.connect()`.
- Relative paths in the config resolve against the config file directory; `~` expands to the home directory.

## Capabilities

### New Capabilities

- `global-config`: Global configuration file discovery, loading, and validation.
- `client-certificates`: Client certificate definition, host matching, and integration with the HTTP executor.

### Modified Capabilities

- `executor`: The executor SHALL accept certificate configuration and construct an undici `Agent` with client TLS credentials when a matching host certificate is found.

## Impact

- **Code**: New module for config loading (`config.ts`), new module for cert matching (`certificates.ts`), modifications to `executor.ts` (`ExecutorConfig` extended), `cli.tsx` (config loading at startup), `app.tsx` (threading certs into `sendSelectedRequest`), and `types.ts` (new types for cert entries).
- **Dependencies**: None — uses existing undici + Node.js TLS APIs.
- **User-facing**: New optional config file. No changes to existing `.http` file syntax or behavior for users who don't adopt mTLS.
