## MODIFIED Requirements

### Requirement: Insecure mode via ExecutorConfig
The executor SHALL accept an optional `ExecutorConfig` parameter with an `insecure` boolean field and an optional `certificates` field of type `Record<string, CertEntry>`. When `insecure` is `true`, the executor SHALL create an undici `Agent` with `connect.rejectUnauthorized` set to `false`. The `certificates` field, when present, SHALL be used to match the request URL's host against certificate entries. When a match is found, the matched certificate's file contents SHALL be merged into the undici `Agent.connect` options.

#### Scenario: Insecure mode skips TLS verification
- **WHEN** `ExecutorConfig.insecure` is `true`
- **THEN** the executor SHALL create an undici Agent with `rejectUnauthorized: false`

#### Scenario: Default mode uses TLS verification
- **WHEN** `ExecutorConfig` is omitted or `insecure` is `false`
- **THEN** the executor SHALL NOT use a custom dispatcher (default TLS verification applies)

#### Scenario: Certificates field threaded through ExecutorConfig
- **WHEN** `ExecutorConfig.certificates` is present and contains a matching entry for the request host
- **THEN** the executor SHALL configure the undici Agent with the matched certificate's credentials
