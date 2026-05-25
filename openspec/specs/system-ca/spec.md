# Spec: System CA

## Purpose

Declares how httptui loads operating-system CA certificates by default, eliminating TLS friction for users behind corporate proxies or with locally-installed root CAs. Also documents Node.js 24's OpenSSL 3.5 security defaults.

## Requirements

### Requirement: System CA certificates loaded by default
httptui SHALL set `NODE_USE_SYSTEM_CA=1` in the process environment before any TLS connections are made. This causes Node.js to load certificates from the operating system's CA certificate store (macOS Keychain, Windows Certificate Store, Linux OpenSSL directories) automatically, eliminating TLS verification failures for users behind corporate proxies or with locally-installed root CAs.

#### Scenario: Corporate proxy CA is trusted without user action
- **WHEN** a user runs `httptui api.http` on a system with a corporate proxy CA installed in the OS certificate store
- **AND** the user has NOT set any `NODE_EXTRA_CA_CERTS` or `NODE_USE_SYSTEM_CA` environment variables
- **THEN** HTTPS requests to endpoints using the corporate proxy CA SHALL succeed without certificate errors

#### Scenario: dist/cli.js contains the env var setup
- **WHEN** `dist/cli.js` is examined after `npm run build`
- **THEN** the file SHALL contain `process.env.NODE_USE_SYSTEM_CA ??= "1"` on the line immediately after the shebang

#### Scenario: User can opt out of system CA loading
- **WHEN** a user runs `NODE_USE_SYSTEM_CA=0 httptui api.http`
- **THEN** Node.js SHALL NOT load system CA certificates (reverting to Node's default bundled CA list)
- **AND** requests to endpoints requiring system CAs SHALL fail with a certificate error

### Requirement: OpenSSL 3.5 behavior documented
The README SHALL document that Node.js 24 ships OpenSSL 3.5 with security level 2, which rejects RSA/DSA/DH keys shorter than 2048 bits and prohibits RC4 cipher suites. This affects connections to legacy servers with weak certificates.

#### Scenario: README mentions OpenSSL 3.5 restrictions
- **WHEN** a user reads the TLS Troubleshooting section of `README.md`
- **THEN** the document SHALL mention that RSA keys shorter than 2048 bits are rejected by Node.js 24's OpenSSL 3.5 defaults
- **AND** the document SHALL mention that RC4 cipher suites are prohibited
