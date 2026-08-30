## Context

`@will8ug/httptui` is a single pure-JS scoped package (`files: ["dist"]`, built by tsup). This repo's `ci.yml` already defines the canonical verification incantation on Node 24: `npm install → typecheck → typecheck:test → build → test`. The reference implementation is restui's `npm-publish.yml` after its switch to trusted publishing (restui commit `33320f5`): npm deprecated the publish/automation tokens that bypass 2FA, so restui removed its `NPM_TOKEN` secret entirely and now authenticates `npm publish` via OIDC — the npm CLI automatically uses short-lived OIDC credentials when a GitHub Actions job holds `id-token: write` and `registry-url: https://registry.npmjs.org`. restui is Rust with platform binaries — its build matrix, artifact staging, and multi-package publish order exist because of that, and do not apply here. What transfers is the flow's *shape*: manual trigger, least-privilege permissions, verify-then-publish, OIDC auth with provenance, and the already-published guard. See proposal.md for motivation.

Prerequisites outside this change: one-time trusted-publisher registration on the existing `@will8ug/httptui` package (it already exists at 0.8.0, so registration is direct — no bootstrap staging), and the repo stays public (it already serves gh-pages badges).

## Goals / Non-Goals

**Goals:**

- A publish flow a maintainer triggers by clicking "Run workflow" — never fires automatically.
- A publish can only happen after the full CI gate (typecheck, typecheck:test, build, test) passes.
- **No npm tokens exist anywhere** — no developer-machine credentials, no repo secrets; authentication is short-lived OIDC per publish job, with provenance attestations on every published version.
- Accidental double-publish attempts fail loudly with actionable guidance ("bump version and re-run").

**Non-Goals:**

- Automatic publishing on tags, releases, or version commits (explicitly rejected — manual only).
- Version bumping or changelog generation inside the workflow; version stays manually bumped in `package.json` before clicking (restui philosophy: version lives in the manifest).
- Bootstrap/staging mode for first-publishing new packages (restui's `publish` input + staged-packages artifact). `@will8ug/httptui` exists on the registry, so this machinery has no purpose here — see decision 7.
- Any changes to `ci.yml`, the package itself, or its tests.

## Decisions

**1. Trigger: `workflow_dispatch` only, no other `on:` events.**
User requirement. Alternative (tag-triggered `on: push: tags: v*`) rejected: automatic triggers are exactly what was asked to avoid. Note: GitHub only offers `workflow_dispatch` runs from the default branch, which is the desired deployment source anyway.

**2. Two jobs: `verify` then `publish`, with `id-token: write` granted only to `publish`.**
`verify` replicates ci.yml's build job verbatim (Node 24, same five commands). `publish` (`needs: verify`) re-checks out and rebuilds. Alternative considered: one job doing both — rejected because the tests would then run holding the OIDC signing permission; job separation keeps `id-token: write` scoped to the final publish steps (least privilege, matching restui). The permission is now dual purpose: OIDC authentication + provenance attestation.

**3. Publish job rebuilds instead of downloading a `dist/` artifact from `verify`.**
restui uploaded artifacts only because its builds ran on three platforms. Here both jobs run on ubuntu; `npm install && npm run build` is seconds, and skipping artifact upload/download removes two action steps and a failure mode (stale/partial artifacts). Trade-off: build runs twice per release — acceptable for a package this size.

**4. `npm install`, not `npm ci`, in both jobs.**
Parity with `ci.yml`, which uses `npm install`. `package-lock.json` is committed, so installs are still locked; `npm ci` would be marginally stricter but would diverge from the repo's own CI convention. If ci.yml ever moves to `npm ci`, this workflow should follow.

**5. Already-published guard: single hard failure, not skip-and-continue.**
restui looped over four packages, skipping published ones and erroring only when *all* were published. With a single package that collapses to: `npm view @will8ug/httptui@$VERSION` succeeds → `::error::` + exit 1, message "bump version in package.json and re-run". Alternative (exit 0 as a green no-op) rejected: a "successful" publish that published nothing hides version-bump mistakes.

**6. Authentication: npm trusted publishing (OIDC) — no token, no flag.**
The publish step is plain `npm publish --access public --provenance` with no `NODE_AUTH_TOKEN` and no login step: the npm CLI (≥ 11.5.1) automatically detects the OIDC environment and authenticates with short-lived credentials before ever falling back to tokens. Node 24's current releases bundle npm ≥ 11.19, satisfying this. `--access public` covers the scoped package; `--provenance` is technically redundant under trusted publishing (attestations are automatic) but harmless — kept for restui parity and explicitness. Alternative considered: a granular `NPM_TOKEN` secret (the pre-switch restui design) — rejected because npm deprecated the 2FA-bypassing publish tokens it depends on, and restui removed exactly this in `33320f5`.

**7. No bootstrap mode: workflow has no `publish` input and no staged-packages artifact.**
restui added a boolean `publish` input (build-and-stage-only when false) because npm only allows configuring a trusted publisher on a package that already exists — new packages must be published once interactively (2FA) before registration. `@will8ug/httptui` already exists on the registry (0.8.0 as of 2026-08-28), so registration happens directly on the live package and the staging flow would be dead complexity. If a future package needs bootstrapping, revisit then.

**8. `concurrency: group npm-publish, cancel-in-progress: false`.**
Double-clicks queue instead of racing. The loser of the queue then hits the already-published guard (decision 5) and fails with the bump reminder — the desired outcome. Workflow-level `permissions: contents: read`, same as restui.

## Risks / Trade-offs

- [Trusted-publisher registration mismatch (wrong workflow filename, repo, or org)] → npm does not validate the configuration when saved; the failure (`ENEEDAUTH`) only surfaces at publish time, after verify passes. Mitigation: the registration prerequisite records the exact filename `npm-publish.yml` (case-sensitive, with extension) and this change creates the file under that exact name; the first end-to-end run (task 3.3) proves the chain before it's relied upon.
- [Repo goes private] → provenance and OIDC trust assumptions break. Mitigation: revisit then; public status is a de facto standing assumption of this project (gh-pages badges).
- [`repository.url` in package.json drifts from the GitHub repo] → npm validates the match; already correct (`git+https://github.com/will8ug/httptui.git`), and it only changes with a repo move, which would force re-registration anyway.
- [Version bumped but workflow run from a stale branch] → publishes whatever ref the runner selected; `workflow_dispatch` defaults to the default branch and surfaces the ref in the run UI, so operator visibility is the mitigation.
- [First OIDC publish of a version that is already live] → 0.8.0 exists on npm; the guard (decision 5) fails the run with the bump reminder rather than attempting a republish. The standing bump-first workflow covers this.
- [Build runs twice (verify + publish)] → accepted cost (decision 3), bounded to manual release cadence.
