# Spec: HTTP Executor

## Purpose

Takes a fully-resolved `ParsedRequest` (variables already substituted) and executes it using `undici`. Returns a structured `ResponseData` object.

## Requirements

### Requirement: Request execution behavior
The executor SHALL use `undici.request()` for HTTP calls, set `Content-Type: application/json` only if the body looks like JSON and no Content-Type header is explicitly set, NOT follow redirects, use a 30-second timeout, and NOT retry failed requests.

#### Scenario: JSON content type auto-detection
- **WHEN** a request has a body that looks like JSON and no explicit Content-Type header
- **THEN** the executor SHALL set `Content-Type: application/json`

#### Scenario: Non-JSON body without explicit Content-Type
- **WHEN** a request has a body that does not look like JSON and no explicit Content-Type header
- **THEN** the executor SHALL NOT set `Content-Type: application/json`

### Requirement: Error handling behavior
The executor SHALL return error objects for network errors (DNS failure, connection refused, timeout) without crashing. Non-2xx status codes SHALL be treated as valid responses, not errors. Invalid URLs SHALL return an error before sending.

#### Scenario: Network error returns error object
- **WHEN** a request fails due to a network error (DNS failure, connection refused, or timeout)
- **THEN** the executor SHALL return a `RequestError` object and SHALL NOT crash

#### Scenario: Non-2xx status is a valid response
- **WHEN** a server responds with a non-2xx status code
- **THEN** the executor SHALL return it as a valid `ResponseData` object, not an error

#### Scenario: Invalid URL returns error before sending
- **WHEN** a request has a malformed or invalid URL
- **THEN** the executor SHALL return a `RequestError` object without making a network call

### Requirement: Response body line-ending normalization
The executor SHALL normalize line endings in the captured response body to LF (`\n`) before returning `ResponseData`. Both CRLF (`\r\n`) sequences and lone CR (`\r`) characters SHALL be replaced with LF. `ResponseData.body` returned by the executor SHALL NOT contain any `\r` characters.

#### Scenario: CRLF-terminated body is normalized
- **WHEN** a server responds with a body whose lines are terminated by `\r\n`
- **THEN** `ResponseData.body` SHALL contain the same text with every `\r\n` replaced by `\n`, and SHALL NOT contain any `\r` characters

#### Scenario: Lone CR in body is normalized
- **WHEN** a server responds with a body containing a lone `\r` that is not followed by `\n`
- **THEN** `ResponseData.body` SHALL contain the same text with every lone `\r` replaced by `\n`

#### Scenario: LF-only body is unchanged
- **WHEN** a server responds with a body whose lines are already terminated only by `\n`
- **THEN** `ResponseData.body` SHALL be byte-identical to the server's body

### Requirement: Response data structure
The executor SHALL return `ResponseData` with `statusCode`, `statusText`, `headers` (as `Record<string, string>`), `body` (normalized string), `timing.durationMs` (total request duration in milliseconds), and `size.bodyBytes` (response body size in bytes).

#### Scenario: Response data captured from successful request
- **WHEN** a request succeeds with status 200
- **THEN** the executor SHALL return `ResponseData` with all fields populated, including timing and size metrics

### Requirement: Insecure mode via ExecutorConfig
The executor SHALL accept an optional `ExecutorConfig` parameter with an `insecure` boolean field. When `insecure` is `true`, the executor SHALL create an undici `Agent` with `connect.rejectUnauthorized` set to `false` and pass it as the `dispatcher` option to `request()`. When `insecure` is `false` or the config is omitted, the executor SHALL use default TLS verification.

#### Scenario: Insecure mode skips TLS verification
- **WHEN** `ExecutorConfig.insecure` is `true`
- **THEN** the executor SHALL create an undici Agent with `rejectUnauthorized: false`

#### Scenario: Default mode uses TLS verification
- **WHEN** `ExecutorConfig` is omitted or `insecure` is `false`
- **THEN** the executor SHALL NOT use a custom dispatcher (default TLS verification applies)

### Requirement: Actionable TLS error messages
When a request fails due to a TLS certificate error, the executor SHALL detect the error code and append remediation hints to the error message. The following error codes SHALL be detected: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `DEPTH_ZERO_SELF_SIGNED_CERT`, `SELF_SIGNED_CERT_IN_CHAIN`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID`. The hint SHALL suggest the `--insecure` flag and `NODE_EXTRA_CA_CERTS` environment variable.

#### Scenario: TLS error includes remediation hint
- **WHEN** a request fails with error code `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
- **THEN** the error message SHALL include a hint suggesting `--insecure` flag and `NODE_EXTRA_CA_CERTS`

### Requirement: CLI --insecure flag
The CLI entry point SHALL recognize `--insecure` and `-k` flags in `process.argv`. When present, the flag SHALL be parsed and removed from the argument list before extracting the file path. The parsed flag SHALL be passed as `ExecutorConfig` to the App component and propagated to the executor.

#### Scenario: --insecure flag parsed and propagated
- **WHEN** the CLI is invoked with `httptui --insecure api.http`
- **THEN** `ExecutorConfig.insecure` SHALL be `true` and `filePath` SHALL be `api.http`

### Requirement: Insecure mode warning in status bar
When insecure mode is active, the status bar SHALL display a visible "INSECURE" warning indicator.

#### Scenario: INSECURE indicator shown when active
- **WHEN** `state.insecure` is `true`
- **THEN** the status bar SHALL display "INSECURE" in a warning color

### Requirement: System CA certificates loaded by default
httptui SHALL load system CA certificates at startup by merging Node.js's bundled Mozilla CA certificates with OS-level certificates via `tls.setDefaultCACertificates([...tls.getCACertificates('bundled'), ...tls.getCACertificates('system')])`, called once during startup before any HTTP requests are made. If the call fails (e.g., OS certificate store is inaccessible), httptui SHALL silently fall back to Node.js's default bundled CA certificates.

#### Scenario: Corporate proxy CA is trusted without user action
- **WHEN** a user runs `httptui api.http` on a system with a corporate proxy CA installed in the OS certificate store
- **THEN** HTTPS requests to endpoints using the corporate proxy CA SHALL succeed without certificate errors

#### Scenario: cli.tsx calls tls.setDefaultCACertificates at startup
- **WHEN** `src/cli.tsx` is examined after the change
- **THEN** it SHALL contain a call to `tls.setDefaultCACertificates([...tls.getCACertificates('bundled'), ...tls.getCACertificates('system')])` before the application starts rendering
- **AND** the call SHALL be wrapped in a try/catch that silently ignores errors

#### Scenario: dist/cli.js does NOT contain NODE_USE_SYSTEM_CA env var setup
- **WHEN** `dist/cli.js` is examined after `npm run build`
- **THEN** the file SHALL NOT contain `process.env.NODE_USE_SYSTEM_CA` in the banner (first two lines)