## 1. Workflow implementation

- [ ] 1.1 Create `.github/workflows/npm-publish.yml` with the skeleton: `name: npm-publish`, `on: workflow_dispatch` only, workflow-level `permissions: contents: read`, and `concurrency: { group: npm-publish, cancel-in-progress: false }`
- [ ] 1.2 Add the `verify` job (ubuntu-latest): checkout, `setup-node` with Node 24, then `npm install`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` — mirroring the build job in `ci.yml`
- [ ] 1.3 Add the `publish` job: `needs: verify`, `permissions: { contents: read, id-token: write }`, checkout, `setup-node` with Node 24 and `registry-url: https://registry.npmjs.org`, then `npm install` and `npm run build`
- [ ] 1.4 In `publish`, add the already-published guard: read `VERSION` from `package.json`, `npm view @will8ug/httptui@$VERSION` — if it exists, emit `::error::@will8ug/httptui@$VERSION already published — bump version in package.json and re-run` and exit 1
- [ ] 1.5 In `publish`, add the publish step: `npm publish --access public --provenance` with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` in env

## 2. Validation

- [ ] 2.1 Validate the workflow file: YAML parses cleanly (and `actionlint` if available); verify every design decision D1–D7 is reflected (dispatch-only trigger, per-job `id-token`, Node 24, single hard-fail guard, `--access public --provenance`, concurrency queue)
- [ ] 2.2 Confirm the change set touches nothing else: `git status` shows only the new workflow file (plus this change's openspec artifacts)

## 3. Release prerequisites (repo settings — outside the repo)

- [ ] 3.1 Add the `NPM_TOKEN` secret to `will8ug/httptui` (granular token with publish rights to the `@will8ug` scope), and verify a manual run from the Actions tab end-to-end for the next release
