## Why

Node.js 20 reached end-of-life on 2026-04-30. Node.js 24 is the latest LTS (since November 2025) and ships `NODE_USE_SYSTEM_CA` support, which solves the long-standing TLS friction for users behind corporate proxies — the deferred optimization documented in `FUTURE.md`. Bumping the floor to Node 24 aligns httptui with the supported runtime landscape, enables zero-friction system CA loading, and unlocks ES2024 syntax and OpenSSL 3.5 security defaults.

## What Changes

- **BREAKING**: Raise the minimum supported Node.js runtime from `>=20` to `>=24`. Installing on Node 20/22 will emit npm's `EBADENGINE` warning and is no longer supported.
- Update `package.json` `engines.node` from `">=20"` to `">=24"`.
- Update `tsup.config.ts` build `target` from `node20` to `node24`.
- Update `tsconfig.json` `target` from `ES2022` to `ES2024` to allow newer syntax features supported by Node 24's V8.
- Add `process.env.NODE_USE_SYSTEM_CA ??= "1";` to the tsup banner (after the shebang) so system CA certificates are loaded by default with zero user action. Users can opt out with `NODE_USE_SYSTEM_CA=0`.
- Delete `FUTURE.md` — the optimization it described is now implemented.
- Simplify the TLS troubleshooting section in `README.md` — system CAs are now the default behavior.
- Add a note to `README.md` about OpenSSL 3.5's stricter crypto defaults (RSA < 2048 bits rejected, RC4 prohibited).

## Capabilities

### New Capabilities
- `system-ca`: httptui loads operating-system CA certificates by default via `NODE_USE_SYSTEM_CA=1`, eliminating TLS friction for users behind corporate proxies or with locally-installed root CAs.

### Modified Capabilities
- `runtime`: Minimum Node.js version changes from `>=20` to `>=24`; build target changes from `node20` to `node24`; TypeScript target changes from `ES2022` to `ES2024`.

## Impact

- **package.json** — `engines.node` field bumped; affects `npm install` warnings for downstream users on Node 20/22.
- **tsup.config.ts** — build target and banner updated; emitted `dist/cli.js` changes.
- **tsconfig.json** — TypeScript compilation target updated; allows newer syntax in source.
- **README.md** — requirements section updated; TLS troubleshooting simplified; OpenSSL 3.5 note added.
- **FUTURE.md** — deleted (resolved).
- **openspec/specs/runtime/spec.md** — spec updated to reflect new floor.
- **Downstream users** — anyone on Node 20 or 22 must upgrade to Node 24+ to install or update httptui.
- **Dependencies** — no dependency bumps required. `undici@^7`, `ink@^6`, `react@^19`, and `@types/node@^25` are all compatible with Node 24.
