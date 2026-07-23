# Client Certificates

Configure SSL client certificates for mTLS endpoints in either the global config file or a project-level `.httptui.json` file. See [Configuration](configuration.md) for config file locations and precedence.

```json
{
  "certificates": {
    "api.internal:8443": {
      "cert": "~/certs/client.pem",
      "key": "~/certs/client.key"
    },
    "legacy.internal": {
      "pfx": "./certs/legacy.p12",
      "passphrase": "$LEGACY_PFX_PASSWORD"
    },
    "*.staging.internal": {
      "cert": "/etc/ssl/staging.crt",
      "key": "/etc/ssl/staging.key"
    },
    "vault.internal": {
      "ca": "./certs/vault-ca.pem"
    }
  }
}
```

## Details

- **Passphrases**: Prefix the value with `$` to reference an environment variable (e.g., `"$MY_PWD"`). Plaintext passphrases are supported but discouraged.
- **CA-only**: Use the `ca` field to trust a specific server without providing client credentials.
- **Matching Priority**: Exact host:port > exact host > wildcard.
- **Protocol**: Client certificates only apply to HTTPS requests. HTTP requests ignore this configuration.
- **Absolute Paths**: Paths starting with `/` are used as-is.

## Project-Level Example

With a `.httptui.json` at `/project/api/.httptui.json`, the relative path `./certs/client.crt` resolves to `/project/api/certs/client.crt`.

```json
{
  "certificates": {
    "api.corp.local": {
      "cert": "./certs/client.crt",
      "key": "./certs/client.key"
    }
  }
}
```
