# Spec: Client Certificates

## Purpose

Client certificate definition, host matching, and integration with the HTTP executor for mutual TLS (mTLS) authentication.

## Requirements

### Requirement: Host-based certificate matching
When an HTTP request is about to be sent, httptui SHALL extract the hostname and port from the request URL and match them against the certificate entries in the loaded config using this priority order:
1. Exact `hostname:port` match (only if port is specified in the URL or is non-default for the scheme)
2. Exact `hostname` match
3. Wildcard match (`*.suffix` matches any hostname that ends with `.suffix`)
4. No match — no client certificate is configured for this host

If multiple wildcard entries match, the entry with the longest suffix SHALL take priority (i.e., `*.internal.corp` wins over `*.corp`).

#### Scenario: Exact host:port match
- **WHEN** a request is sent to `https://api.example.com:8443/data` and the config contains both `"api.example.com:8443"` and `"api.example.com"` entries
- **THEN** the certificate entry for `api.example.com:8443` SHALL be used

#### Scenario: Exact host match when no port in config
- **WHEN** a request is sent to `https://api.example.com/data` (default port 443) and the config contains only `"api.example.com"`
- **THEN** the certificate entry for `api.example.com` SHALL be used

#### Scenario: Wildcard match
- **WHEN** a request is sent to `https://foo.staging.internal/data` and the config contains `"*.staging.internal"` but no exact match
- **THEN** the certificate entry for `*.staging.internal` SHALL be used

#### Scenario: Longer wildcard suffix wins
- **WHEN** a request is sent to `https://api.dev.internal.corp/data` and the config contains both `"*.dev.internal.corp"` and `"*.corp"`
- **THEN** the certificate entry for `*.dev.internal.corp` SHALL be used

#### Scenario: No match means no client certificate
- **WHEN** a request is sent to `https://public-api.example.com/data` and no config entry matches
- **THEN** the request SHALL be sent without a client certificate (normal TLS behavior)

#### Scenario: Plain HTTP request to matched host is treated as no-op
- **WHEN** a request is sent to `http://api.example.com/data` (plain HTTP, no TLS) and the config contains a matching entry for `api.example.com`
- **THEN** the configured client certificate SHALL be silently ignored (client certs only apply to TLS connections)

### Requirement: Certificate file loading at request time
When a matching certificate entry is found for a request, httptui SHALL read the certificate files (`cert`, `key`, `pfx`, `ca`) from disk using `fs.readFileSync` at request time. The file contents SHALL be passed as `Buffer` objects to the undici `Agent.connect` options.

If a referenced certificate file does not exist or is unreadable, the request SHALL fail with a clear error indicating the missing file path and the host it was matched for. The error SHALL appear in the TUI response panel (same display as network errors).

#### Scenario: Cert files read and passed to undici
- **WHEN** a matching entry specifies `cert`, `key`, and `ca`, and all three files exist
- **THEN** httptui SHALL read all three files into `Buffer` objects and pass them to the undici `Agent` connect options as `cert`, `key`, and `ca`

#### Scenario: Missing cert file produces clear error
- **WHEN** a matching entry's `cert` file does not exist at the resolved path
- **THEN** the request SHALL fail with an error message: `"Certificate file not found: <resolved-path> (for host <hostname>)"`
- **AND** httptui SHALL NOT crash and SHALL display the error in the response panel

#### Scenario: Cert config with only ca (no client auth)
- **WHEN** a matching entry specifies only `ca` (no `cert`, `key`, or `pfx`)
- **THEN** httptui SHALL pass only the `ca` buffer to the undici `Agent.connect` options (custom server trust, no client authentication)

### Requirement: undici Agent construction with client certificates
The executor SHALL construct the undici `Agent` such that its `connect` option includes any matched certificate fields (`cert`, `key`, `pfx`, `passphrase`, `ca`) alongside the existing `rejectUnauthorized` setting from `ExecutorConfig.insecure`. When no certificate entry matches the request, the executor SHALL either omit the `Agent` (default TLS) or create one with only `rejectUnauthorized` as before.

#### Scenario: Agent created with client cert and insecure mode
- **WHEN** `ExecutorConfig.insecure` is `true` and a matching certificate entry provides `cert` and `key`
- **THEN** the undici `Agent` SHALL be created with `connect: { rejectUnauthorized: false, cert: <buffer>, key: <buffer> }`

#### Scenario: No certificate match uses default behavior
- **WHEN** no certificate entry matches the request URL and `ExecutorConfig.insecure` is `false`
- **THEN** the executor SHALL NOT use a custom dispatcher (default TLS verification, same as pre-feature behavior)

#### Scenario: Agent created with PFX and passphrase
- **WHEN** a matching certificate entry specifies `pfx` and `passphrase` (resolved from env var)
- **THEN** the undici `Agent` SHALL be created with `connect: { pfx: <buffer>, passphrase: <string> }`
