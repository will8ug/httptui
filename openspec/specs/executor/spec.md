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
The executor SHALL return error objects for network errors (DNS failure, connection refused, timeout) without crashing. Non-2xx status codes SHALL be treated as valid responses, not errors.

#### Scenario: Network error returns error object
- **WHEN** a request fails due to a network error (DNS failure, connection refused, or timeout)
- **THEN** the executor SHALL return a `RequestError` object and SHALL NOT crash

#### Scenario: Non-2xx status is a valid response
- **WHEN** a server responds with a non-2xx status code
- **THEN** the executor SHALL return it as a valid `ResponseData` object, not an error

### Requirement: Response body line-ending normalization

The executor SHALL normalize line endings in the captured response body to LF (`\n`) before returning `ResponseData`. Both CRLF (`\r\n`) sequences and lone CR (`\r`) characters SHALL be replaced with LF. `ResponseData.body` returned by the executor SHALL NOT contain any `\r` characters.

This guarantees a single invariant that all downstream consumers (renderer, search indexer, scroll calculator, details panel) can rely on when splitting the body into lines via `split('\n')`.

#### Scenario: CRLF-terminated body is normalized
- **WHEN** a server responds with a body whose lines are terminated by `\r\n`
- **THEN** `ResponseData.body` SHALL contain the same text with every `\r\n` replaced by `\n`, and SHALL NOT contain any `\r` characters

#### Scenario: Lone CR in body is normalized
- **WHEN** a server responds with a body containing a lone `\r` that is not followed by `\n` (e.g. classic Mac line endings or a malformed stream)
- **THEN** `ResponseData.body` SHALL contain the same text with every lone `\r` replaced by `\n`, and SHALL NOT contain any `\r` characters

#### Scenario: Mixed line endings are normalized
- **WHEN** a server responds with a body that contains a mix of `\r\n`, `\r`, and `\n` line endings
- **THEN** `ResponseData.body` SHALL contain the same text with every line ending represented as a single `\n`, and SHALL NOT contain any `\r` characters

#### Scenario: LF-only body is unchanged
- **WHEN** a server responds with a body whose lines are already terminated only by `\n`
- **THEN** `ResponseData.body` SHALL be byte-identical to the server's body

#### Scenario: Empty body is unchanged
- **WHEN** a server responds with an empty body
- **THEN** `ResponseData.body` SHALL be the empty string `""`

## Input

```typescript
interface ResolvedRequest {
  method: HttpMethod;
  url: string;           // fully resolved, absolute URL
  headers: Record<string, string>;
  body: string | undefined;
}
```

## Output

```typescript
interface ResponseData {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timing: {
    durationMs: number;  // total request duration in milliseconds
  };
  size: {
    bodyBytes: number;   // response body size
  };
}
```

## Behavior

### Request Execution
- Use `undici.request()` for HTTP calls
- Set `Content-Type: application/json` only if body looks like JSON and no Content-Type header is explicitly set
- Follow redirects: **no** (by default, undici doesn't follow redirects — keep this behavior)
- Timeout: 30 seconds (hardcoded for V1)
- No retries

### Response Handling
- Read full response body as string (UTF-8)
- Normalize line endings: replace \r\n with \n, then replace lone \r with \n
- Capture all response headers
- Measure timing from request start to response body fully read

### Error Handling
- Network errors (DNS failure, connection refused, timeout) → return error object, don't crash
- Non-2xx status codes are NOT errors — they're valid responses to display
- Invalid URL → return error before sending

### TLS
- Accept self-signed certificates: **configurable** — disabled by default, enabled when `--insecure` flag is passed or `ExecutorConfig.insecure` is `true`.
- No client certificate support in V1

### Insecure Mode via ExecutorConfig

The executor accepts an optional `ExecutorConfig` parameter with an `insecure` boolean field. When `insecure` is `true`, the executor creates an undici `Agent` with `connect.rejectUnauthorized` set to `false` and passes it as the `dispatcher` option to `request()`. When `insecure` is `false` or the config is omitted, the executor uses default TLS verification (no custom dispatcher).

### Actionable TLS Error Messages

When a request fails due to a TLS certificate error, the executor detects the error code and appends remediation hints to the error message. The following error codes are detected: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `DEPTH_ZERO_SELF_SIGNED_CERT`, `SELF_SIGNED_CERT_IN_CHAIN`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID`. The hint suggests the `--insecure` flag and `NODE_EXTRA_CA_CERTS` environment variable.

### CLI --insecure Flag

The CLI entry point recognizes `--insecure` and `-k` flags in `process.argv`. When present, the flag is parsed and removed from the argument list before extracting the file path. The parsed flag is passed as `ExecutorConfig` to the App component and propagated to the executor.

### Insecure Mode Warning

When insecure mode is active, the status bar in the TUI displays a visible "INSECURE" warning indicator.
