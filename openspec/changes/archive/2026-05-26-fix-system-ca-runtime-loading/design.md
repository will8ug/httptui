## Context

httptui's previous change (upgrade-node-24-system-ca) attempted to enable system CA certificate loading by injecting `process.env.NODE_USE_SYSTEM_CA ??= "1"` into the tsup banner. This does not work because Node.js reads `NODE_USE_SYSTEM_CA` during process initialization — before any user code runs. The TLS subsystem is already initialized with bundled Mozilla CAs by the time our banner code executes.

Users behind corporate proxies still encounter `unable to verify the first certificate` errors. Testing confirmed the env var approach is ineffective.

Node.js 24 (and 22.19+) provides two runtime APIs that solve this:
- `tls.getCACertificates('system')` — retrieves OS CA certificates (macOS Keychain, Windows Certificate Store, Linux OpenSSL dirs) as DER-encoded Buffers
- `tls.setDefaultCACertificates(certs)` — replaces the default CA store for all subsequent TLS connections

## Goals / Non-Goals

**Goals:**
- Fix system CA certificate loading so it actually works at runtime
- Support all platforms: macOS, Windows (including npm's cmd-shim), Linux
- Use built-in Node.js 24 APIs — no new dependencies
- Maintain the `unable to verify the first certificate` error for users behind corporate proxies

**Non-Goals:**
- Adding a user-facing opt-out flag for system CA loading (the `--insecure` flag already disables all cert verification)
- Supporting Node.js versions below 24 (the `tls.getCACertificates` / `tls.setDefaultCACertificates` APIs require 22.19+)
- Changing the undici executor architecture (Agent/dispatcher pattern stays as-is)

## Decisions

### D1. Use `tls.setDefaultCACertificates()` instead of passing CAs to undici Agent

**Decision:** Call `tls.setDefaultCACertificates(tls.getCACertificates('system'))` once at startup in `cli.tsx`, rather than creating a custom undici Agent with `connect: { ca: ... }`.

**Rationale:**
- `setDefaultCACertificates` affects **all** TLS connections globally — undici, `https`, any future libraries. No need to configure each client individually.
- The existing executor code only creates a custom Agent for `--insecure` mode. Adding another always-on Agent would complicate the dispatcher logic.
- It's a single line of code in one place.
- This is the same effect that `--use-system-ca` has when set at process init time — we're just doing it at runtime.

**Alternatives rejected:**
- **Custom undici Agent with `connect: { ca }`** — would work for undici but not for any other TLS connection. Also requires DER→PEM conversion since `tls.getCACertificates('system')` returns DER Buffers but undici's `connect.ca` expects PEM strings. More code, narrower effect.
- **`system-ca` npm package** — unnecessary dependency; Node.js 24 has the APIs built-in.

### D2. Call placement: early in `cli.tsx` before the app starts

**Decision:** Place the `tls.setDefaultCACertificates` call in `src/cli.tsx` before the Ink `render()` call, immediately after imports.

**Rationale:** The call must happen before any HTTP request is made. In the current code, `cli.tsx` is the entry point — it parses CLI args and renders the app. The first HTTP request happens when the user presses Enter inside the TUI. Placing the call before `render()` guarantees it runs first.

### D3. Remove `NODE_USE_SYSTEM_CA` from tsup banner

**Decision:** Revert the banner to `#!/usr/bin/env node` (plain shebang only). Remove `process.env.NODE_USE_SYSTEM_CA ??= "1";`.

**Rationale:** The env var line is dead code — it has never worked (Node reads it during init, before user code). Leaving it would be misleading and could confuse future debugging.

### D4. Remove `NODE_USE_SYSTEM_CA=0` opt-out from README

**Decision:** Remove the "Disabling system CA loading" subsection from the README TLS Troubleshooting section. The `--insecure` flag remains the documented escape hatch for users who don't want cert verification.

**Rationale:** The `NODE_USE_SYSTEM_CA=0` opt-out was tied to the env var mechanism. With programmatic loading, there's no env var to unset. Users who want to skip cert verification already have `--insecure`. Adding a new `--no-system-ca` flag would be feature creep for an edge case.

### D5. Guard the call with a try/catch

**Decision:** Wrap `tls.setDefaultCACertificates(tls.getCACertificates('system'))` in a try/catch that silently falls back to default (bundled) CAs if it fails.

**Rationale:** `getCACertificates('system')` could throw on unusual platforms or if the OS certificate store is inaccessible. Silently falling back to bundled CAs means httptui still works — it just won't trust custom corporate CAs, same as before this change. A loud error would break the app for no good reason.

## Risks / Trade-offs

- **Risk:** `tls.getCACertificates('system')` has a non-trivial performance overhead on first call (reads OS certificate store, parses certificates).
  → **Mitigation:** Acceptable — called once at startup. The delay is milliseconds, and the app is a TUI where startup time is not latency-critical.

- **Risk:** `setDefaultCACertificates` replaces the default CA store entirely. If system CAs don't include the standard Mozilla roots, connections to public websites could break.
  → **Mitigation:** On all major platforms (macOS, Windows, Linux), the OS certificate store includes the standard root CAs. This is the same behavior browsers have. The risk is negligible in practice.

- **Trade-off:** No user-facing opt-out for system CA loading (beyond `--insecure` which disables all verification). Users who want only bundled CAs without system CAs cannot do so easily.
  → **Acceptable:** This is an edge case. The whole point of the feature is to load system CAs. Users who need different behavior can set `NODE_EXTRA_CA_CERTS` for additional certs or use `--insecure`.
