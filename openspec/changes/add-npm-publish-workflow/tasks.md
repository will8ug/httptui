## 1. Workflow implementation

- [ ] 1.1 Create `.github/workflows/npm-publish.yml` with the skeleton: `name: npm-publish`, `on: workflow_dispatch` only (no inputs), workflow-level `permissions: contents: read`, and `concurrency: { group: npm-publish, cancel-in-progress: false }`
- [ ] 1.2 Add the `verify` job (ubuntu-latest): checkout, `setup-node` with Node 24, then `npm install`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` — mirroring the build job in `ci.yml`
- [ ] 1.3 Add the `publish` job: `needs: verify`, `permissions: { contents: read, id-token: write }`, checkout, `setup-node` with Node 24 and `registry-url: https://registry.npmjs.org`, then `npm install` and `npm run build`
- [ ] 1.4 In `publish`, add the already-published guard: read `VERSION` from `package.json`, `npm view @will8ug/httptui@$VERSION` — if it exists, emit `::error::@will8ug/httptui@$VERSION already published — bump version in package.json and re-run` and exit 1
- [ ] 1.5 In `publish`, add the publish step: plain `npm publish --access public --provenance` — **no** `NODE_AUTH_TOKEN` env, no login step (npm trusted publishing auto-detects OIDC via `id-token: write`)

## 2. Validation

- [ ] 2.1 Validate the workflow file: YAML parses cleanly (and `actionlint` if available); verify every design decision D1–D8 is reflected (dispatch-only trigger with no inputs, per-job `id-token`, Node 24, single hard-fail guard, tokenless OIDC publish, no bootstrap/staging steps, concurrency queue) and that no `secrets.` or `NODE_AUTH_TOKEN` reference remains anywhere in the file
- [ ] 2.2 Confirm the change set touches nothing else: `git status` shows only the new workflow file (plus this change's openspec artifacts)

## 3. Release prerequisites (npm settings — outside the repo)

- [ ] 3.1 Register the trusted publisher on the existing `@will8ug/httptui` package: npmjs.com → package → Settings → Trusted Publisher (org `will8ug`, repo `httptui`, workflow filename `npm-publish.yml` — exact name, case-sensitive, with extension — allow publish). CLI equivalent: `npm trust github @will8ug/httptui --file npm-publish.yml --repository will8ug/httptui --allow-publish` (requires 2FA on the npm account)
- [ ] 3.2 Harden (recommended by npm, matches restui): set the package's publishing access to "Require two-factor authentication and disallow tokens"; ensure no `NPM_TOKEN` secret exists in repo settings — nothing should use one
- [ ] 3.3 Prove the chain end-to-end: bump `version` past the already-published 0.8.0, commit to main, run the workflow from the Actions tab, then verify `npm view @will8ug/httptui version` and the provenance badge on the package page
