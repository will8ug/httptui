## MODIFIED Requirements

### Requirement: TLS option mapping
When insecure mode is active (the `--insecure`/`-k` CLI flag), the serializer SHALL append the `-k` flag to the command. When a client certificate matches the resolved request's host, the serializer SHALL append the certificate's file paths as quoted arguments: PEM entries as `--cert '<cert>' --key '<key>'`, PFX entries as `--cert '<pfx>' --pass '<passphrase>'`, and a `ca` file when present as `--cacert '<ca>'`. When neither applies, no TLS flags SHALL be emitted. No `--max-time` or `-L` flag SHALL be emitted: the executor imposes no request timeout, so curl's default behavior already matches, and neither curl nor the executor follows redirects.

#### Scenario: Insecure mode adds -k
- **WHEN** httptui was started with `--insecure` and the user copies any request
- **THEN** the command SHALL end with the `-k` flag

#### Scenario: Matched PEM client certificate adds cert and key flags
- **WHEN** the resolved URL's host matches a PEM certificate entry with `cert: /certs/client.pem` and `key: /certs/client.key`
- **THEN** the command SHALL contain `--cert '/certs/client.pem' --key '/certs/client.key'`

#### Scenario: Matched PFX certificate adds cert and pass flags
- **WHEN** the resolved URL's host matches a PFX entry with `pfx: /certs/client.pfx` and passphrase `s3cret`
- **THEN** the command SHALL contain `--cert '/certs/client.pfx' --pass 's3cret'`

#### Scenario: No TLS options when none configured
- **WHEN** insecure mode is off and no certificate matches the host
- **THEN** the command SHALL NOT contain `-k`, `--cert`, `--key`, `--pass`, or `--cacert`
