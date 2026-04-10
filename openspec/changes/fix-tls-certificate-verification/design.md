## Context

httptui uses undici's `request()` with no TLS configuration. Node.js by default trusts only its bundled Mozilla CA certificates. When users operate behind corporate proxies or against internal services with locally-installed root CAs, the TLS handshake fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` because those CAs aren't in the bundled set.

VS Code REST Client avoids this because Electron's Chromium networking stack reads the OS certificate store automatically.

Current executor code (lines 82-87 of `executor.ts`) passes only `method`, `headers`, `body`, and `signal` to `request()`. No `dispatcher` or TLS connect options.

## Goals / Non-Goals

**Goals:**
- Allow users to bypass TLS verification via `--insecure` flag for quick unblocking.
- Surface actionable remediation in TLS error messages (suggest `NODE_EXTRA_CA_CERTS`, `--use-system-ca`, `--insecure`).
- Thread TLS config from CLI args through to the executor without polluting the core parser/variable layers.

**Non-Goals:**
- Programmatic system CA loading (`tls.getCACertificates('system')` requires Node 25.9+ — our minimum is 18).
- Client certificate (mTLS) support.
- Per-request TLS configuration (all requests in a session share the same TLS policy).
- Config file for TLS settings (CLI flags and env vars are sufficient for v1).

## Decisions

### 1. Use undici `Agent` with `connect.rejectUnauthorized` for `--insecure`

**Choice**: Create an undici `Agent({ connect: { rejectUnauthorized: false } })` and pass it as the `dispatcher` option when `--insecure` is set.

**Why**: This is undici's documented mechanism for TLS configuration. It avoids the global `NODE_TLS_REJECT_UNAUTHORIZED=0` side-effect and scopes the insecure behavior to our requests only.

**Alternatives considered**:
- Setting `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` at startup — rejected because it's global and affects all TLS in the process (including any future plugin/extension scenarios).
- Adding a custom CA file flag (`--ca-file`) — deferred. `NODE_EXTRA_CA_CERTS` already covers this use case without code changes.

### 2. TLS config as an `ExecutorConfig` object, not a global

**Choice**: Define an `ExecutorConfig` interface (`{ insecure: boolean }`) and pass it to `executeRequest()`.

**Why**: Keeps the executor testable and explicit. The CLI parses flags and constructs the config; the executor doesn't read `process.argv` or globals.

### 3. Enhanced TLS error messages in the executor

**Choice**: Detect TLS-specific error codes (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `DEPTH_ZERO_SELF_SIGNED_CERT`, `SELF_SIGNED_CERT_IN_CHAIN`, `CERT_HAS_EXPIRED`, `ERR_TLS_CERT_ALTNAME_INVALID`) and append remediation hints to the error message.

**Why**: The raw Node.js error messages are opaque to users unfamiliar with TLS. A hint like "Try: httptui --insecure file.http" or "Set NODE_EXTRA_CA_CERTS=/path/to/ca.pem" is immediately actionable.

### 4. Parse `--insecure` before the file path argument

**Choice**: Manually parse `process.argv` for `--insecure` / `-k` before extracting the file path (skip over flag arguments).

**Why**: httptui has no argument parser dependency, and adding one (like yargs) for a single boolean flag is overkill. The current CLI already reads `process.argv[2]` directly — we extend this to filter known flags first.

## Risks / Trade-offs

- **`--insecure` misuse** → Users may default to `--insecure` instead of properly installing CAs. Mitigation: Print a visible warning to stderr when insecure mode is active.
- **Error code detection is fragile** → Node.js/OpenSSL may change error codes across versions. Mitigation: Fall through to the original error message if the code is unrecognized. The hint is additive, not replacing.
- **No system CA integration** → Users on Node <23.8 with custom CAs must use `NODE_EXTRA_CA_CERTS`. Mitigation: Document this clearly in README. The `--use-system-ca` flag (Node 23.8+) can be passed via `NODE_OPTIONS=--use-system-ca` — mention this in docs.
