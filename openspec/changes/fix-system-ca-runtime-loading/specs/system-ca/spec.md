## MODIFIED Requirements

### Requirement: System CA certificates loaded by default
httptui SHALL load system CA certificates at runtime via `tls.setDefaultCACertificates(tls.getCACertificates('system'))`, called once during startup before any HTTP requests are made. This causes Node.js to use certificates from the operating system's CA certificate store (macOS Keychain, Windows Certificate Store, Linux OpenSSL directories) for all TLS connections, eliminating TLS verification failures for users behind corporate proxies or with locally-installed root CAs. If the call fails (e.g., OS certificate store is inaccessible), httptui SHALL silently fall back to Node.js's default bundled CA certificates.

#### Scenario: Corporate proxy CA is trusted without user action
- **WHEN** a user runs `httptui api.http` on a system with a corporate proxy CA installed in the OS certificate store
- **THEN** HTTPS requests to endpoints using the corporate proxy CA SHALL succeed without certificate errors

#### Scenario: cli.tsx calls tls.setDefaultCACertificates at startup
- **WHEN** `src/cli.tsx` is examined after the change
- **THEN** it SHALL contain a call to `tls.setDefaultCACertificates(tls.getCACertificates('system'))` before the application starts rendering
- **AND** the call SHALL be wrapped in a try/catch that silently ignores errors

#### Scenario: dist/cli.js does NOT contain NODE_USE_SYSTEM_CA env var setup
- **WHEN** `dist/cli.js` is examined after `npm run build`
- **THEN** the file SHALL NOT contain `process.env.NODE_USE_SYSTEM_CA` in the banner (first two lines)

## REMOVED Requirements

### Requirement: User can opt out of system CA loading
**Reason**: The `NODE_USE_SYSTEM_CA=0` opt-out was tied to the env var mechanism which does not work. With programmatic loading via `tls.setDefaultCACertificates`, there is no env var to unset. Users who need to skip certificate verification can use the existing `--insecure` flag.
**Migration**: Use `httptui --insecure` (or `-k`) to disable TLS certificate verification entirely.
