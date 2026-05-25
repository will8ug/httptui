## Context

httptui currently declares `engines.node: ">=20"` in `package.json`, sets `target: 'node20'` in `tsup.config.ts`, and uses `"target": "ES2022"` in `tsconfig.json`. The shebang is a plain `#!/usr/bin/env node`.

Users behind corporate proxies hit `UNABLE_TO_VERIFY_LEAF_SIGNATURE` errors because Node.js does not load OS CA certificates by default. The workaround (`--insecure` flag or `NODE_EXTRA_CA_CERTS`) requires manual user action. `FUTURE.md` documented a deferred optimization to solve this via `--use-system-ca`, blocked on a Node version bump.

Node.js 20 reached EOL on 2026-04-30. Node.js 24 LTS (since November 2025, EOL ~2028) ships stable `NODE_USE_SYSTEM_CA` support and OpenSSL 3.5.

## Goals / Non-Goals

**Goals:**
- Bump minimum Node.js version to >=24 across all surfaces (package.json, tsup, tsconfig, docs, specs)
- Enable system CA certificate loading by default with zero user friction
- Maintain full cross-platform portability (macOS, Linux, Windows, Alpine)
- Update documentation to reflect new defaults and OpenSSL 3.5 behavior

**Non-Goals:**
- Removing the `--insecure` flag (still useful for truly broken certs)
- Adding new TLS configuration options beyond what Node.js provides natively
- Dropping the standalone `undici` dependency in favor of Node's built-in fetch (separate concern)
- Enabling OpenSSL legacy provider for users with weak keys (their problem to solve)

## Decisions

### D1. Engine floor: `>=24` (no minor pin)

**Decision:** Set `engines.node` to `">=24"`.

**Rationale:** Node 24 is the latest LTS line with a ~2028 EOL horizon. While `--use-system-ca` was backported to Node 22.19.0, jumping to >=24 gives the longest support runway and access to OpenSSL 3.5, V8 13.6, and stable `require(esm)`. The aggressive floor is acceptable for a v0.x CLI tool where users install globally and typically run the latest Node.

**Alternatives rejected:**
- `>=22` — shorter runway (EOL 2027-04), would still need another bump soon. Also ships older OpenSSL 3.4.
- `>=22.19` — minor-pinning is unconventional for `engines` fields and creates confusion without material benefit.

### D2. System CA via runtime env var (Option B)

**Decision:** Inject `process.env.NODE_USE_SYSTEM_CA ??= "1";` as the first line after the shebang in the tsup banner.

**Rationale:** The `#!/usr/bin/env -S node --use-system-ca` shebang approach (Option A from `FUTURE.md`) has known cross-platform failures:
- Windows: npm's `cmd-shim` parser treats `-S` as the executable name
- Alpine/BusyBox: `env` doesn't support `-S`
- BSD: `env` implementations generally lack `-S`

Google's Gemini CLI explicitly reverted this pattern ([PR #24756](https://github.com/google-gemini/gemini-cli/pull/24756)). The env var approach is portable everywhere and achieves the same result — Node.js loads system CAs on the first TLS connection.

The `??=` operator ensures users can opt out by explicitly setting `NODE_USE_SYSTEM_CA=0` before invocation.

**Alternatives rejected:**
- Option A (`#!/usr/bin/env -S node --use-system-ca`) — cross-platform failures on Windows, Alpine, BSD.
- Option C (document env var, user sets it) — requires user action, which is the exact friction `FUTURE.md` wanted to eliminate.

### D3. tsup banner format

**Decision:** The tsup `banner.js` field becomes:
```
#!/usr/bin/env node
process.env.NODE_USE_SYSTEM_CA ??= "1";
```

This is a single string with `\n` separator. The resulting `dist/cli.js` starts with the shebang (for Unix execution) followed by the env var setup (runs before any imports).

### D4. TypeScript target bumps to ES2024

**Decision:** Set `tsconfig.json` `target` to `"ES2024"`.

**Rationale:** Node 24's V8 13.6 supports all ES2024 features natively (`Object.groupBy`, `Promise.withResolvers`, `Array.fromAsync`, `ArrayBuffer.prototype.resize`). Bumping the target allows TypeScript to emit these without downleveling, producing smaller and faster output. The tsup `target: 'node24'` handles the final emit target, so tsconfig's target is the "what syntax can we use in source" knob.

**Alternatives rejected:**
- Keep `ES2022` — works but unnecessarily conservative; leaves performance on the table.
- `ESNext` — too volatile; pins behavior to whatever TypeScript version is installed.

### D5. `tsup` target bumps in lockstep

**Decision:** Set `target: 'node24'` in `tsup.config.ts` in the same change that bumps `engines.node`.

**Rationale:** This is a project invariant — the build target must match the engines floor. The prior change (drop-node-18-support) established this pattern. Keeping them in sync prevents emitting bytecode the advertised runtime can't parse or wasting cycles downleveling syntax we don't need to support.

### D6. Delete FUTURE.md entirely

**Decision:** Remove `FUTURE.md` from the repository.

**Rationale:** The file contained a single deferred optimization (system CA via shebang). That optimization is now implemented (via the env var approach). There are no other items in the file. If future deferred items arise, a new `FUTURE.md` can be created.

### D7. README TLS section simplification

**Decision:** Restructure the TLS Troubleshooting section:
1. Lead with "httptui loads system CA certificates by default" — the new happy path
2. Keep `NODE_EXTRA_CA_CERTS` as option for additional custom certs
3. Keep `--insecure` as last resort
4. Add note about OpenSSL 3.5: security level 2 rejects RSA/DSA/DH keys < 2048 bits and prohibits RC4 ciphers
5. Mention `NODE_USE_SYSTEM_CA=0` as opt-out escape hatch

## Risks / Trade-offs

- **Risk:** Node 24 is younger than Node 22 LTS; some enterprise users may not have upgraded yet.
  → **Mitigation:** npm emits advisory `EBADENGINE` warning only; installs still proceed. Users on Node 22 can continue using their existing httptui version until they upgrade Node.

- **Risk:** OpenSSL 3.5 security level 2 may reject connections to legacy servers with weak RSA keys (< 2048 bits), causing new TLS errors that didn't exist on Node 20/22.
  → **Mitigation:** Document this in README's TLS section. This is a Node.js/OpenSSL policy decision, not an httptui bug. Users must either upgrade their server certs or use `--insecure`.

- **Risk:** `process.env.NODE_USE_SYSTEM_CA ??= "1"` runs before any module imports. If a future Node version changes the env var semantics, httptui could behave unexpectedly.
  → **Mitigation:** The feature is actively maintained in Node core with a stable API surface. The `??=` operator ensures user-set values are never overwritten. Worst case: remove the line in a future release.

- **Risk:** First TLS connection has a non-trivial performance overhead when loading system CAs (documented in Node.js issue #58990).
  → **Mitigation:** Acceptable for a CLI tool that makes a small number of HTTP requests per session. Not a hot path.

- **Trade-off:** Going `>=24` instead of `>=22` excludes Node 22 LTS users (EOL 2027-04-30). This is intentional — longer runway, newer crypto defaults, and alignment with the "latest LTS" philosophy for a v0.x tool.
