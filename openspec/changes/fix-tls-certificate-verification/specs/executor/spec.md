## ADDED Requirements

### Requirement: Insecure mode via ExecutorConfig

The executor SHALL accept an optional `ExecutorConfig` parameter with an `insecure` boolean field. When `insecure` is `true`, the executor SHALL create an undici `Agent` with `connect.rejectUnauthorized` set to `false` and pass it as the `dispatcher` option to `request()`. When `insecure` is `false` or the config is omitted, the executor SHALL use default TLS verification (no custom dispatcher).

#### Scenario: Insecure mode skips certificate verification
- **WHEN** `executeRequest` is called with `{ insecure: true }` against an endpoint with an untrusted certificate
- **THEN** the request SHALL succeed and return a `ResponseData` (not a `RequestError`)

#### Scenario: Default mode rejects untrusted certificates
- **WHEN** `executeRequest` is called without config (or `{ insecure: false }`) against an endpoint with an untrusted certificate
- **THEN** the request SHALL return a `RequestError` with a TLS-related error code

### Requirement: Actionable TLS error messages

When a request fails due to a TLS certificate error, the executor SHALL detect the error code and append remediation hints to the error message. The following error codes SHALL be detected: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `DEPTH_ZERO_SELF_SIGNED_CERT`, `SELF_SIGNED_CERT_IN_CHAIN`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID`. The hint SHALL suggest `--insecure` flag and `NODE_EXTRA_CA_CERTS` environment variable.

#### Scenario: UNABLE_TO_VERIFY_LEAF_SIGNATURE produces actionable error
- **WHEN** a request fails with error code `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
- **THEN** the returned `RequestError.message` SHALL contain the original error message AND a hint mentioning `--insecure` and `NODE_EXTRA_CA_CERTS`

#### Scenario: Non-TLS errors are not modified
- **WHEN** a request fails with a non-TLS error (e.g., `ECONNREFUSED`)
- **THEN** the returned `RequestError.message` SHALL contain only the original error message with no TLS hints appended

### Requirement: CLI --insecure flag

The CLI entry point SHALL recognize `--insecure` and `-k` flags in `process.argv`. When present, the flag SHALL be parsed and removed from the argument list before extracting the file path. The parsed flag SHALL be passed as `ExecutorConfig` to the App component and propagated to the executor.

#### Scenario: --insecure flag is parsed and file path is extracted correctly
- **WHEN** the user runs `httptui --insecure api.http`
- **THEN** the CLI SHALL set `insecure: true` in the config AND correctly identify `api.http` as the file path

#### Scenario: -k shorthand works identically
- **WHEN** the user runs `httptui -k api.http`
- **THEN** the CLI SHALL set `insecure: true` in the config AND correctly identify `api.http` as the file path

#### Scenario: Flag after file path is also accepted
- **WHEN** the user runs `httptui api.http --insecure`
- **THEN** the CLI SHALL set `insecure: true` in the config AND correctly identify `api.http` as the file path

### Requirement: Insecure mode warning

When insecure mode is active, the status bar in the TUI SHALL display a visible warning indicator. This ensures users are aware that certificate verification is disabled.

#### Scenario: Status bar shows insecure warning
- **WHEN** the TUI is running with `insecure: true`
- **THEN** the status bar SHALL display an insecure mode indicator (e.g., "INSECURE" label)

#### Scenario: No warning in default mode
- **WHEN** the TUI is running without insecure mode
- **THEN** the status bar SHALL NOT display an insecure mode indicator

## MODIFIED Requirements

### TLS
- Accept self-signed certificates: **configurable** — disabled by default, enabled when `--insecure` flag is passed or `ExecutorConfig.insecure` is `true`.
- No client certificate support in V1.
