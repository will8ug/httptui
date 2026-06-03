## Context

httptui is a terminal-based HTTP client built on undici. It already supports server-side TLS trust (system CA loading, `--insecure`, `NODE_EXTRA_CA_CERTS`) but has no mechanism for mutual TLS (mTLS) where the client presents its own certificate.

The existing TLS plumbing passes a single boolean (`ExecutorConfig.insecure`) into an undici `Agent`'s `connect` option. Undici's `buildConnector` is a direct passthrough to Node.js `tls.connect()`, which already supports all standard TLS options including `cert`, `key`, `pfx`, `passphrase`, and `ca`. The only gap is that no user-facing configuration feeds those fields.

This change introduces a **global-only** config file for V1. No project-level overrides, no `.http` file directives, no CLI flags for cert paths.

Key constraint: httptui must work on macOS, Linux, and Windows. The Node.js runtime is 24+.

## Goals / Non-Goals

**Goals:**

- Provide a single global config file to map host names to client certificates (PEM and PFX/P12).
- Support custom CA certificates for server trust (no client auth).
- Reference passphrases only via `$ENVIRONMENT_VARIABLE` syntax — never plaintext.
- Match request URLs to configured certificates using exact host:port, exact host, or wildcard (`*.domain`).
- Load certificate files lazily (on request, not at startup) so a missing cert for an unused host does not block the TUI.
- Work on macOS, Linux, and Windows with correct path semantics.
- Missing config file = silent no-op (no error, no behavior change).

**Non-Goals:**

- Project-level config (`.httptui.json`) — deferred to V2.
- Sidecar config beside the `.http` file — deferred to V2.
- Interactive passphrase prompt in the TUI — deferred to V2.
- `--config` / `--cert` / `--key` CLI flag overrides — deferred to V2.
- Global fallback certificate (apply to all hosts) — deferred to V2.
- Certificate caching or TLS session management beyond undici defaults.
- Client certificate revocation checking (CRL/OCSP).

## Decisions

### D1: Config file location follows XDG conventions

The config file lives at `$XDG_CONFIG_HOME/httptui/config.json` on macOS/Linux (typically `~/.config/httptui/config.json`) and `%APPDATA%\httptui\config.json` on Windows.

**Why**: This follows the XDG Base Directory Specification, the de facto standard for CLI tools on Unix. It matches how OpenCode, ESLint, and other modern tools organize their files.

**Why not CLI flags** (`--cert`, `--key`): CLI flags work for single-host invocations but become unwieldy for tools that send requests to multiple hosts in one session. A config file is the natural choice for multi-host tools.

### D2: `XDG_CONFIG_HOME` and `APPDATA` override via explicit env vars

Priority order for config location:
1. `$HTTP_TUI_CONFIG` — explicit override (for testing or custom layouts)
2. `$XDG_CONFIG_HOME/httptui/config.json` (macOS/Linux)
3. `$APPDATA\httptui\config.json` (Windows)
4. `~/.config/httptui/config.json` (hardcoded fallback using `os.homedir()`)

**Why**: Explicit environment variables give users and test suites full control. The fallback chain ensures reasonable defaults on every platform without runtime detection failures.

### D3: Host matching uses fixed priority: exact > wildcard > none

When a request fires, the URL's hostname and port are matched against the config's certificate keys:
1. Exact `host:port` match (e.g., `api.example.com:8443`)
2. Exact `host` match (e.g., `api.example.com`)
3. Wildcard match (e.g., `*.example.com`)
4. No match → no certificate sent

**Why not regex or glob patterns**: Regex is overkill for hostnames (they're DNS names, not arbitrary strings). Wildcards cover the multi-subdomain case cleanly. More precise patterns create parsing complexity without proportional user benefit.

### D4: Relative paths resolve against the config file directory, not CWD

```
~/.config/httptui/
  ├── config.json
  └── certs/              ← relative "./certs/client.crt" resolves HERE
      ├── client.crt
      └── client.key
```

**Why**: Cert files logically belong next to the config file. CWD-dependent resolution breaks when a user invokes httptui from a different directory.

**Why not `cwd`-relative**: CWD is unpredictable (`cd` to project dir, run httptui with absolute .http path — CWD != config dir).

### D5: Passphrases are $ENV_VAR-only references

Config syntax: `"passphrase": "$CERT_PASSPHRASE"` → read from `process.env.CERT_PASSPHRASE` at request time. If the variable is not set, the request fails with a clear error.

**Why**: Plaintext passphrases in config files are a security risk (accidental commit, world-readable files, shell history). Env vars are the standard secret-injection pattern and match httptui's existing `$processEnv` / `$dotenv` variables.

**Why not interactive prompt (V1)**: An interactive TUI overlay adds significant state management complexity. V1 prioritizes the CI/CD use case (non-interactive, env vars only). The TUI prompt is a V2 UX improvement.

### D6: Certificate files are loaded lazily per-request

When a request fires, the matching certificate entry is located, and `fs.readFileSync` is called to read the cert/key/pfx files. If the file is missing, the request fails with a clear error in the response panel.

**Why**: At startup, we don't know which hosts the user will hit. Loading all configured certs upfront blocks startup and emits errors for unused hosts. Lazy loading means "just works" for users whose configs reference certs they don't always have available (e.g., laptop vs. CI).

### D7: Validation is lenient with warnings

The config JSON parser uses standard `JSON.parse` (no custom schema validator in V1). Unknown fields in the `certificates` entries are silently ignored. Structural errors (missing required fields like both `cert` and `key` when one is provided) emit warnings to stderr but do not prevent startup.

**Why**: Forward-compatible. Users can leave extra fields. Structural errors are reported without crashing.

**Why not strict validation (e.g., Zod)**: Adds a dependency for a small schema. Simple hand-written validation is sufficient for V1.

### D8: undici `Agent` construction uses spread-passed `connect` options

The executor builds the `Agent.connect` object by spreading all matched cert fields:

```ts
new Agent({
  connect: {
    ...insecure ? { rejectUnauthorized: false } : {},
    ...(certConfig ?? {})   // cert, key, pfx, passphrase, ca
  }
})
```

**Why**: Matches undici's documented API. No transformation of TLS fields is needed — undici passes them through to `tls.connect()` unmodified.

**Why not custom connector**: Custom connectors bypass undici's internal session caching and ALPN handling. The spread approach is simpler and benefits from undici's default behaviors.

### D9: Config loading happens once, at CLI startup

`cli.tsx` calls a single `loadConfig()` before rendering the `<App>`. The loaded config is passed via `AppProps.executorConfig`. The certificate matching and file loading happen inside `sendSelectedRequest`.

**Why**: Matches the existing architecture where `ExecutorConfig` is immutable across the session. The config file is not re-read on every request (file changes require restart) — a V2 enhancement.

## Risks / Trade-offs

### R1: Plaintext cert files on disk

**Risk**: Certificate files (`client.crt`, `client.key`, etc.) must exist as plain files on disk. A compromised machine exposes the private key.
**Mitigation**: httptui does not store or copy keys — it reads them in-memory per-request and lets the OS file permissions handle access control. This is the same model as curl, VS Code REST Client, and Postman.

### R2: Env var passphrases may leak in process listings

**Risk**: Environment variables passed via shell (e.g., `HTTPS_PASS=secret httptui api.http`) appear in `ps` output on some systems.
**Mitigation**: Users can set the env var in a profile file (`~/.zshrc`) or a dedicated env file. The risk is inherent to env vars and not made worse by httptui.

### R3: Lazy loading reads the same cert file on every request

**Risk**: If a user sends many requests to the same mTLS host, the cert file is read multiple times.
**Mitigation**: `readFileSync` for small files (< 10KB) is fast (< 1ms). For V1, simplicity wins. V2 can add an in-memory cache keyed by file path+mtime.

### R4: Wildcard matching ambiguity

**Risk**: A config entry `*.example.com` matches any subdomain including `a.b.example.com`. If a user intends single-level wildcard only, they may get unexpected matches.
**Mitigation**: Document that wildcards match any depth (DNS-style). A more precise glob syntax (`*.sub.example.com`) is available as an alternative. V2 can add glob support if needed.

## Migration Plan

V1 is additive only — no behavior change for users who do not create the config file.

1. **Deploy**: No action needed. httptui continues to work exactly as before for users without `~/.config/httptui/config.json`.
2. **Opt-in**: Users who need mTLS create the config file. Documentation explains the schema and gives examples.
3. **Rollback**: Delete the config file to revert to no mTLS.

## Open Questions

1. **Config file watching (V2)**: Should httptui watch `config.json` for changes and reload? Useful for CI workflows where a setup script regenerates the config.
2. **Project-level override merging strategy (V2)**: When both global and `.httptui.json` exist, do they merge per-host or does project completely override global?
3. **Wildcard depth limit (V2)**: Should `*.example.com` match `a.b.example.com`, or only single-level? Current design: any depth. A glob-based approach (`.**example.com`) is an alternative.
4. **TLS session reuse visibility (V2)**: undici caches TLS sessions internally. For debugging, should httptui expose whether a cached session was reused?
