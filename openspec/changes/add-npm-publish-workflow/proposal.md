## Why

Releasing `@will8ug/httptui` to npm currently means running `npm publish` from a local machine, so npm credentials live on developer machines and every release depends on a correctly-configured local environment. The restui project already established a manual-click GitHub Actions publish flow; porting its shape here gives reproducible, credential-isolated releases while keeping the human in charge of when a release happens.

## What Changes

- Add `.github/workflows/npm-publish.yml`, triggered **only** via `workflow_dispatch` (manual click from the Actions tab — no push/tag triggers).
- The flow has two jobs, modeled on restui's `npm-publish`:
  - **verify** — mirrors this repo's CI gate: checkout, Node 24, `npm install`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test`. A red build can never publish.
  - **publish** — needs `verify`; checks out, rebuilds (`npm install` + `npm run build`), then publishes with `--access public --provenance` using `NPM_TOKEN`.
- Port restui's guardrails:
  - `permissions: contents: read` at workflow level; `id-token: write` granted only to the publish job (npm provenance).
  - `concurrency: npm-publish` with `cancel-in-progress: false` — double-clicks queue instead of racing.
  - `npm view @will8ug/httptui@$VERSION` pre-check: if the version already exists on the registry, the job fails with a clear "bump version in package.json and re-run" error instead of blindly attempting a publish.
- Version bumps remain a manual pre-click step in `package.json` (same philosophy as restui's Cargo.toml bump).

## Capabilities

### New Capabilities

None. This change adds CI tooling only; the workflow file is self-documenting in the repo (AGENTS.md precedent: the `eslint-config` spec was removed as self-documenting tooling, and `ci.yml` has no spec). The change declares `skip_specs: true` in `.openspec.yaml`.

### Modified Capabilities

None. No runtime behavior, CLI surface, or spec-level requirement changes.

## Impact

- **New file only**: `.github/workflows/npm-publish.yml`. No source, test, or dependency changes.
- **Repo prerequisite**: an `NPM_TOKEN` secret (granular token with publish rights to the `@will8ug` scope) must exist on `will8ug/httptui` before the first run — configured once in repo settings, outside this change.
- **Provenance**: publishing with `--provenance` requires the repo to be public; it already publishes gh-pages badges, so this holds.
- **Node version**: the workflow pins Node 24 to match `engines.node: ">=24"` and CI's `NODE_VERSION: '24.x'` (restui's publish job used Node 22, which would be wrong here).
