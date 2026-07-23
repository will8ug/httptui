# TLS Troubleshooting

httptui loads system CA certificates by default. This means certificates from your OS certificate store (macOS Keychain, Windows Certificate Store, Linux OpenSSL directories) are trusted automatically — the same behavior as browsers and VS Code REST Client.

When a TLS error occurs, httptui displays a smart hint suggesting the appropriate fix (e.g., `--insecure` or `NODE_EXTRA_CA_CERTS`).

If you need to authenticate with a client certificate, see [Client Certificates](certificates.md) for mTLS configuration.

## Common fixes

### 1. Point to your CA certificate file

If you have a custom CA certificate not in your OS store (e.g., a self-signed dev cert), use `NODE_EXTRA_CA_CERTS`:

```bash
NODE_EXTRA_CA_CERTS=/path/to/your-ca.pem httptui api.http
```

The file should be PEM-encoded and can contain multiple certificates.

### 2. Skip certificate verification (not recommended)

As a last resort, disable TLS verification entirely:

```bash
httptui --insecure api.http
httptui -k api.http
```

**Warning**: This disables all certificate checks, making connections vulnerable to man-in-the-middle attacks. Use only for local development or trusted networks.

## OpenSSL 3.5 restrictions (Node.js 24+)

Node.js 24 ships OpenSSL 3.5 with security level 2 by default. This means:

- **RSA, DSA, and DH keys shorter than 2048 bits are rejected.**
- **RC4 cipher suites are prohibited.**

If you connect to a legacy server with weak certificates, you may see new TLS errors that didn't occur on earlier Node.js versions. The fix is to upgrade the server's certificates to use at least 2048-bit RSA keys.
