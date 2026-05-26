# Spec: System CA

## Purpose

Declares how httptui loads operating-system CA certificates by default, eliminating TLS friction for users behind corporate proxies or with locally-installed root CAs. Also documents Node.js 24's OpenSSL 3.5 security defaults.

## Requirements

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

### Requirement: OpenSSL 3.5 behavior documented
The README SHALL document that Node.js 24 ships OpenSSL 3.5 with security level 2, which rejects RSA/DSA/DH keys shorter than 2048 bits and prohibits RC4 cipher suites. This affects connections to legacy servers with weak certificates.

#### Scenario: README mentions OpenSSL 3.5 restrictions
- **WHEN** a user reads the TLS Troubleshooting section of `README.md`
- **THEN** the document SHALL mention that RSA keys shorter than 2048 bits are rejected by Node.js 24's OpenSSL 3.5 defaults
- **AND** the document SHALL mention that RC4 cipher suites are prohibited
