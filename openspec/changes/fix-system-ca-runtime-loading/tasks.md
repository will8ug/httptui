## 1. Fix system CA loading mechanism

- [ ] 1.1 In `tsup.config.ts`, revert the `banner.js` field from `'#!/usr/bin/env node\nprocess.env.NODE_USE_SYSTEM_CA ??= "1";'` to `'#!/usr/bin/env node'`.
- [ ] 1.2 In `src/cli.tsx`, add `import tls from 'node:tls';` at the top with other imports.
- [ ] 1.3 In `src/cli.tsx`, add a try/catch block before the Ink `render()` call that executes `tls.setDefaultCACertificates(tls.getCACertificates('system'))`, silently ignoring errors.

## 2. Update documentation

- [ ] 2.1 In `README.md`, remove the "Disabling system CA loading" subsection (the `NODE_USE_SYSTEM_CA=0` opt-out). Keep `NODE_EXTRA_CA_CERTS` and `--insecure` as the remaining troubleshooting options.

## 3. Update OpenSpec system-ca spec

- [ ] 3.1 In `openspec/specs/system-ca/spec.md`, update the "System CA certificates loaded by default" requirement to reference `tls.setDefaultCACertificates(tls.getCACertificates('system'))` instead of `NODE_USE_SYSTEM_CA=1`.
- [ ] 3.2 In `openspec/specs/system-ca/spec.md`, update the "dist/cli.js contains the env var setup" scenario to verify the env var is NOT present in the banner.
- [ ] 3.3 In `openspec/specs/system-ca/spec.md`, remove the "User can opt out of system CA loading" scenario (replaced by `--insecure` flag).

## 4. Verification

- [ ] 4.1 Run `npm run build` and confirm exit code 0.
- [ ] 4.2 Run `npm run test` and confirm all tests pass.
- [ ] 4.3 Run `npm run lint` and confirm no new lint errors.
- [ ] 4.4 Verify `dist/cli.js` first line is `#!/usr/bin/env node` and does NOT contain `NODE_USE_SYSTEM_CA` in the banner area.
- [ ] 4.5 Verify `dist/cli.js` contains `setDefaultCACertificates` and `getCACertificates` in the bundled code.
