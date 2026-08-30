## Why

Releasing `@will8ug/httptui` to npm currently means running `npm publish` from a local machine, so npm credentials live on developer machines and every release depends on a correctly-configured local environment. The classic fix — a long-lived `NPM_TOKEN` secret in GitHub Actions — is a dead end: npm has deprecated the publish/automation tokens that bypass 2FA. The restui project already solved this: a manual-click GitHub Actions publish flow that now authenticates via **npm trusted publishing (OIDC)** — short-lived per-job credentials, no stored tokens at all. Porting its shape here gives reproducible, tokenless releases while keeping the human in charge of when a release happens.

## What Changes

- Add `.github/workflows/npm-publish.yml`, triggered **only** via `workflow_dispatch` (manual click from the Actions tab — no push/tag triggers).
- The flow has two jobs, modeled on restui's `npm-publish`:
  - **verify** — mirrors this repo's CI gate: checkout, Node 24, `npm install`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test`. A red build can never publish.
  - **publish** — needs `verify`; checks out, rebuilds (`npm install` + `npm run build`), then publishes with `npm publish --access public --provenance` authenticated by **trusted publishing (OIDC)** — no `NODE_AUTH_TOKEN`, no npm token secret anywhere. The npm CLI automatically uses OIDC when the job has `id-token: write` and `registry-url: https://registry.npmjs.org`.
- Port restui's guardrails:
  - `permissions: contents: read` at workflow level; `id-token: write` granted only to the publish job (dual purpose: OIDC auth + provenance).
  - `concurrency: npm-publish` with `cancel-in-progress: false` — double-clicks queue instead of racing.
  - `npm view @will8ug/httptui@$VERSION` pre-check: if the version already exists on the registry, the job fails with a clear "bump version in package.json and re-run" error instead of blindly attempting a publish.
- Version bumps remain a manual pre-click step in `package.json` (same philosophy as restui's Cargo.toml bump).
- restui's **bootstrap mode** (`publish` input + staged-packages artifact for first-publishing packages that don't exist on npm yet) is deliberately **not** ported: `@will8ug/httptui` already exists on the registry (0.8.0), so trusted-publisher registration is a direct one-time step with no staging flow needed.

## Capabilities

### New Capabilities

None. This change adds CI tooling only; the workflow file is self-documenting in the repo (AGENTS.md precedent: the `eslint-config` spec was removed as self-documenting tooling, and `ci.yml` has no spec). The change declares `skip_specs: true` in `.openspec.yaml`.

### Modified Capabilities

None. No runtime behavior, CLI surface, or spec-level requirement changes.

## Impact

- **New file only**: `.github/workflows/npm-publish.yml`. No source, test, or dependency changes.
- **One-time prerequisite (outside the repo)**: register the workflow as a trusted publisher on the existing `@will8ug/httptui` package — npmjs.com → package → Settings → Trusted Publisher (org `will8ug`, repo `httptui`, workflow filename `npm-publish.yml`, allow publish), or `npm trust github @will8ug/httptui --file npm-publish.yml --repository will8ug/httptui --allow-publish`. No `NPM_TOKEN` secret is ever created; recommended hardening afterwards is "require 2FA and disallow tokens" on the package, which tokenless publishing survives.
- **Provenance**: generated automatically for trusted-publishing CI publishes; requires the repo to be public, which holds (it already publishes gh-pages badges). `package.json` `repository.url` already points at `will8ug/httptui`, which npm validates.
- **Node version**: the workflow pins Node 24 to match `engines.node: ">=24"` and CI's `NODE_VERSION: '24.x'`. Current Node 24.x bundles npm ≥ 11.5.1 (latest bundles 11.19), which trusted publishing requires.
