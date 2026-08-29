## Context

`@will8ug/httptui` is a single pure-JS scoped package (`files: ["dist"]`, built by tsup). This repo's `ci.yml` already defines the canonical verification incantation on Node 24: `npm install → typecheck → typecheck:test → build → test`. The reference implementation is restui's `npm-publish.yml`, but restui is Rust with platform binaries — its build matrix, artifact staging, and multi-package publish order exist because of that, and do not apply here. What transfers is the flow's *shape*: manual trigger, least-privilege permissions, verify-then-publish, provenance, and the already-published guard. See proposal.md for motivation.

Prerequisites outside this change: an `NPM_TOKEN` secret on the repo, and the repo stays public (it already serves gh-pages badges).

## Goals / Non-Goals

**Goals:**

- A publish flow a maintainer triggers by clicking "Run workflow" — never fires automatically.
- A publish can only happen after the full CI gate (typecheck, typecheck:test, build, test) passes.
- npm credentials never touch a developer machine; provenance attestations on published versions.
- Accidental double-publish attempts fail loudly with actionable guidance ("bump version and re-run").

**Non-Goals:**

- Automatic publishing on tags, releases, or version commits (explicitly rejected — manual only).
- Version bumping or changelog generation inside the workflow; version stays manually bumped in `package.json` before clicking (restui philosophy: version lives in the manifest).
- Any changes to `ci.yml`, the package itself, or its tests.

## Decisions

**1. Trigger: `workflow_dispatch` only, no other `on:` events.**
User requirement. Alternative (tag-triggered `on: push: tags: v*`) rejected: automatic triggers are exactly what was asked to avoid. Note: GitHub only offers `workflow_dispatch` runs from the default branch, which is the desired deployment source anyway.

**2. Two jobs: `verify` then `publish`, with `id-token: write` granted only to `publish`.**
`verify` replicates ci.yml's build job verbatim (Node 24, same five commands). `publish` (`needs: verify`) re-checks out and rebuilds. Alternative considered: one job doing both — rejected because the tests would then run holding the provenance signing permission; job separation keeps `id-token: write` scoped to the final publish steps (least privilege, matching restui).

**3. Publish job rebuilds instead of downloading a `dist/` artifact from `verify`.**
restui uploaded artifacts only because its builds ran on three platforms. Here both jobs run on ubuntu; `npm install && npm run build` is seconds, and skipping artifact upload/download removes two action steps and a failure mode (stale/partial artifacts). Trade-off: build runs twice per release — acceptable for a package this size.

**4. `npm install`, not `npm ci`, in both jobs.**
Parity with `ci.yml`, which uses `npm install`. `package-lock.json` is committed, so installs are still locked; `npm ci` would be marginally stricter but would diverge from the repo's own CI convention. If ci.yml ever moves to `npm ci`, this workflow should follow.

**5. Already-published guard: single hard failure, not skip-and-continue.**
restui looped over four packages, skipping published ones and erroring only when *all* were published. With a single package that collapses to: `npm view @will8ug/httptui@$VERSION` succeeds → `::error::` + exit 1, message "bump version in package.json and re-run". Alternative (exit 0 as a green no-op) rejected: a "successful" publish that published nothing hides version-bump mistakes.

**6. `npm publish --access public --provenance` with `NODE_AUTH_TOKEN: secrets.NPM_TOKEN` and `registry-url: https://registry.npmjs.org`.**
`--access public` is mandatory for the `@will8ug` scope on first publish of each version; `--provenance` requires the `id-token: write` permission and a public repo — both hold. Mirrors restui's publish job, adjusted from its Node 22 to this repo's Node 24 (`engines.node: ">=24"`).

**7. `concurrency: group npm-publish, cancel-in-progress: false`.**
Double-clicks queue instead of racing. The loser of the queue then hits the already-published guard (decision 5) and fails with the bump reminder — the desired outcome. Workflow-level `permissions: contents: read`, same as restui.

## Risks / Trade-offs

- [NPM_TOKEN missing, expired, or lacking publish rights to the scope] → verify passes, publish fails with npm's E401/E403 after the fact. Mitigation: one-time setup documented in the proposal; the guard runs before publishing, so no half-published state exists for this failure mode.
- [Repo goes private] → `--provenance` starts failing. Mitigation: revisit then (drop the flag or stay public); public status is a de facto standing assumption of this project.
- [Version bumped but workflow run from a stale branch] → publishes whatever ref the runner selected; `workflow_dispatch` defaults to the default branch and surfaces the ref in the run UI, so operator visibility is the mitigation.
- [Build runs twice (verify + publish)] → accepted cost (decision 3), bounded to manual release cadence.
