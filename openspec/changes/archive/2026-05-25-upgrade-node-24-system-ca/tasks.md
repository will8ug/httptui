## 1. Bump Node.js engine and build targets

- [x] 1.1 In `package.json`, change `engines.node` from `">=20"` to `">=24"` (line 18).
- [x] 1.2 In `tsup.config.ts`, change `target: 'node20'` to `target: 'node24'` (line 6).
- [x] 1.3 In `tsconfig.json`, change `"target": "ES2022"` to `"target": "ES2024"` (line 3).

## 2. Enable system CA certificates by default

- [x] 2.1 In `tsup.config.ts`, change the `banner.js` field from `'#!/usr/bin/env node'` to `'#!/usr/bin/env node\nprocess.env.NODE_USE_SYSTEM_CA ??= "1";'` (line 11).
- [x] 2.2 Run `npm run build` and verify `dist/cli.js` starts with the shebang followed by the `NODE_USE_SYSTEM_CA` assignment on the next line.

## 3. Update documentation

- [x] 3.1 In `README.md`, update the Requirements section from "Node.js 20 or newer" to "Node.js 24 or newer" and update the `engines.node` reference accordingly.
- [x] 3.2 In `README.md`, rewrite the TLS Troubleshooting section: lead with "httptui loads system CA certificates by default", keep `NODE_EXTRA_CA_CERTS` and `--insecure` as fallbacks, add `NODE_USE_SYSTEM_CA=0` opt-out, and remove the `NODE_OPTIONS=--use-system-ca` instruction (no longer needed).
- [x] 3.3 In `README.md`, add a note about OpenSSL 3.5 stricter crypto defaults: RSA/DSA/DH keys < 2048 bits rejected, RC4 cipher suites prohibited.
- [x] 3.4 Delete `FUTURE.md` from the repository root.

## 4. Update OpenSpec runtime spec

- [x] 4.1 In `openspec/specs/runtime/spec.md`, update the "Minimum Node.js runtime version" requirement to declare Node.js 24 as minimum, change `">=20"` references to `">=24"`, and update scenario text (Node 18 → Node 22 for the warning scenario, Node 20 → Node 24 for the success scenario).
- [x] 4.2 In `openspec/specs/runtime/spec.md`, update the "Build target matches minimum runtime" requirement to reference `node24` instead of `node20`.
- [x] 4.3 In `openspec/specs/runtime/spec.md`, add a new requirement "TypeScript compilation target" specifying that `tsconfig.json` target SHALL be `"ES2024"`.
- [x] 4.4 In `openspec/specs/runtime/spec.md`, update the "Documentation advertises the supported runtime" requirement to reference Node.js 24 instead of Node.js 20.

## 5. Verification

- [x] 5.1 Run `npm run build` and confirm exit code 0.
- [x] 5.2 Run `npm run test` and confirm all tests pass.
- [x] 5.3 Run `npm run lint` and confirm no new lint errors.
- [x] 5.4 Verify `dist/cli.js` first two lines are the shebang and `process.env.NODE_USE_SYSTEM_CA ??= "1";`.
- [x] 5.5 Grep the repo (excluding `node_modules`, `dist`, `openspec/changes/archive`, and `package-lock.json`) for `node20`, `>=20`, `">=20"`, `Node.js 20`, `Node ≥20` and confirm zero first-party hits remain.
