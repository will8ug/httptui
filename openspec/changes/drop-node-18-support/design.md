## Context

httptui currently declares `engines.node: ">=18"` in `package.json` and sets `target: 'node18'` in `tsup.config.ts`. This made sense when the project was bootstrapped, but the runtime landscape has shifted:

- **Node.js 18.x reached End-of-Life on 2025-04-30** — it no longer receives security patches. ([Node releases table](https://nodejs.org/en/about/releases), [EOL page](https://nodejs.org/en/eol))
- **Node.js 20.x** is Active/Maintenance LTS with EOL 2026-04-30; **Node.js 22.x** is LTS with EOL 2027-04-30. ([Node releases table](https://nodejs.org/en/about/releases))
- Transitive dependencies are already ahead of us: `undici@7`, `ink@6`, `react@19`, and `@types/node@25` all declare `>=20` (or stricter) in their own `engines` fields. Our floor is effectively a lie.
- The pending `--use-system-ca` optimization tracked in `FUTURE.md` lands in Node 23.8+; we cannot get there without first clearing the Node 18 floor. ([PR #56599](https://github.com/nodejs/node/pull/56599), [PR #57009](https://github.com/nodejs/node/pull/57009))

Concrete current state (verified in this repo):

| File | Current value | New value |
| --- | --- | --- |
| `package.json` → `engines.node` | `">=18"` | `">=20"` |
| `tsup.config.ts` → `target` | `'node18'` | `'node20'` |
| `AGENTS.md` → Gotchas note | "Node ≥18 required" | "Node ≥20 required" |
| `FUTURE.md` → "Use system CA" note | "bump `>=18` to `>=23.8`" and "When Node.js 18 and 20 reach EOL" | "bump `>=20` to `>=23.8`" and "When Node.js 20 reaches EOL" |
| `README.md` | No "Requirements" section | Add one stating Node ≥20 |

There are no CI workflows, no `.nvmrc`/`.node-version` files, no Dockerfiles, and no `process.version` checks in source — so the change surface is limited to the five files above.

## Goals / Non-Goals

**Goals:**
- Bring the declared runtime floor in line with what is actually supported upstream (Node 18 is EOL; dependencies require ≥20).
- Bump the build target so emitted output can use post-Node-18 syntax/APIs (stable `fetch`, `node:test`, `structuredClone`, etc.) without tsup downleveling them.
- Make the minimum Node version discoverable by end-users (README) and contributors (AGENTS.md) — not just buried in `package.json`.
- Keep `FUTURE.md` truthful about what currently blocks the `--use-system-ca` shebang change.

**Non-Goals:**
- Do **not** jump directly to Node 22 or Node 24. Node 20 is the smallest supported step up from 18 and gives the widest end-user audience. A later change can tighten to 22 once the ecosystem warrants it.
- Do **not** change any feature behavior. No TUI, parser, executor, or variables logic changes.
- Do **not** enable `engine-strict` in `.npmrc`. npm's default advisory behavior is sufficient; forcing strictness would surprise users globally.
- Do **not** implement the `--use-system-ca` shebang change in this work. That remains a separate future change, just with its precondition reduced to "Node 23.8+" rather than "Node 18 → 23.8".
- Do **not** refactor source code to take advantage of Node 20-only APIs in this change. Any API adoption should come as its own focused change.

## Decisions

### D1. Floor is Node 20, not Node 22 or Node 20.x.y

**Decision:** `engines.node` becomes `">=20"` (no minor/patch pin).

**Rationale:**
- Node 20 is the oldest line still in LTS (EOL 2026-04-30), so it's the smallest step that drops an unsupported runtime.
- Users on Node 20.0.0 through 20.latest should all install successfully; a minor-level pin (e.g., `>=20.10`) would exclude users who haven't applied the latest patch with no material benefit to us today.
- Following ecosystem convention: Vite dropped Node 18 and set `>=20` as the floor ([vitejs/vite#19972](https://github.com/vitejs/vite/pull/19972)), later tightening to `>=20.19` only when they needed a specific API ([vitejs/vite#20032](https://github.com/vitejs/vite/pull/20032)). We have no such API dependency yet.

**Alternatives considered:**
- `">=22"` — gives a longer support window (EOL 2027-04-30) but shuts out users still on Node 20 LTS. Node 20 users are the vast majority of "LTS-tracking" users in early 2026. **Rejected** as too aggressive for a v0.x TUI tool.
- `">=20.10"` or similar minor pin — no concrete feature currently requires a specific 20.x minor, so adds friction without benefit. **Rejected.**
- Status quo (`">=18"`) — advertising support for an EOL runtime is a security smell and contradicts our own dependencies. **Rejected.**

### D2. `tsup` target bumps in lockstep with `engines.node`

**Decision:** Set `target: 'node20'` in `tsup.config.ts` in the same change that bumps `engines.node`.

**Rationale:** Keeping these in sync is an invariant — if the build target were left at `node18` we'd waste cycles downleveling syntax we don't need to support, and if it got ahead of `engines.node` we'd ship bytecode the advertised runtime can't parse. A single change maintains the invariant. Encoded as a scenario in `specs/runtime/spec.md`.

**Alternatives considered:**
- Keep `target: 'node18'` for "maximum compatibility" — pointless once Node 18 is unsupported; only adds transpilation overhead. **Rejected.**

### D3. Rely on npm's default advisory `engines` behavior

**Decision:** Do not add `engine-strict = true` to any `.npmrc`. Let npm emit `EBADENGINE` warnings when installed on an unsupported runtime, but allow the install to proceed.

**Rationale:**
- npm's official docs state the `engines` field "is advisory only and will only produce warnings" unless the user opts in to `engine-strict`. ([npm package.json docs](https://docs.npmjs.com/cli/v10/configuring-npm/package-json))
- Hard-failing installs for global CLI users on Node 18 would be a worse experience than a warning + soft failure at runtime if they actually hit a Node 20-only feature. Most Node 18 features we use work on Node 18.x anyway; the `EBADENGINE` warning is the right signal.
- Follows ecosystem precedent (Vite, tsup, ink, undici all declare engines without forcing strict mode).

**Alternatives considered:**
- Ship `.npmrc` with `engine-strict=true` — would block Node 18 installs outright. Too heavy-handed; the warning is sufficient. **Rejected.**
- Add a runtime `process.version` check in `cli.tsx` that exits with a friendly error — adds code, complicates tests, and duplicates what npm already reports. **Rejected** for this change; can revisit if user reports suggest the warning is getting missed.

### D4. Documentation lives in three places, each with a distinct audience

**Decision:**
- `package.json` `engines.node` — the machine-readable source of truth (parsed by npm).
- `README.md` "Requirements" section — for end-users discovering the tool.
- `AGENTS.md` Gotchas note — for contributors and AI agents working in the repo.

**Rationale:** Each audience consults a different surface; all three must agree to avoid drift. The `runtime` spec requires all three. We also patch `FUTURE.md` because it explicitly references the `>=18` floor as a precondition — leaving that reference stale would mislead whoever picks up the `--use-system-ca` work.

### D5. Introduce a `runtime` capability spec

**Decision:** Create a new `openspec/specs/runtime/` capability rather than sprinkling runtime-version requirements into existing specs.

**Rationale:**
- No existing spec (executor, parser, tui, variables, shortcuts, etc.) describes runtime/packaging — they all describe user-observable product behavior.
- A dedicated `runtime` spec gives future infra work (the `--use-system-ca` bump, a future Node-22 floor, etc.) a natural home and keeps product specs free of toolchain noise.
- Matches this project's existing convention of one spec per capability.

**Alternatives considered:**
- Put the requirements under `executor` — executor is about HTTP semantics, not the JS runtime. Adding unrelated concerns there would dilute it. **Rejected.**
- Skip the spec entirely — project convention requires at least one spec delta per change, and a declared runtime floor is legitimately a testable system property (the `EBADENGINE` scenario is literally a test case). **Rejected.**

## Risks / Trade-offs

- **Risk:** Users on Node 18 see an `EBADENGINE` warning when upgrading httptui and don't know what to do.
  **Mitigation:** Add a clear "Requirements: Node.js 20 or newer" section near the top of `README.md` (above the Installation block) so the requirement is visible before install. The warning itself points to the `engines.node` value, so once users see the README note they know how to react.

- **Risk:** The tsup `target: 'node20'` change silently lets Node-20-only syntax/APIs slip into `dist/cli.js` that we didn't intend to adopt, making future downgrades harder.
  **Mitigation:** The existing smoke test (`test/cli-smoke.test.ts`) spawns `dist/cli.js` and verifies it starts cleanly, so gross breakage is caught. For this change we are deliberately *not* rewriting source to use Node 20+ APIs; any future adoption is a separate, reviewed change.

- **Risk:** Transitive `url.parse` deprecation warnings (surfaced in Node 20, [CHANGELOG_V20.md](https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V20.md)) could appear if any dependency still uses the legacy URL parser.
  **Mitigation:** We use `undici@7` for HTTP and the WHATWG `URL` global ourselves; no first-party `url.parse` calls exist. Third-party warnings would already appear for any httptui user on Node 20, so this bump doesn't change their exposure.

- **Risk:** Node 20's experimental Permission Model ([v20.0.0 release notes](https://nodejs.org/en/blog/release/v20.0.0)) could be enabled by users and block file reads (we read `.http` files and `.env` files). We don't opt into it, but the knob exists.
  **Mitigation:** Documented behavior: httptui requires filesystem reads to function; users enabling `--permission` must grant `--allow-fs-read`. Not in scope for this change to document, but noted here so reviewers don't flag it as a surprise.

- **Trade-off:** Going to `>=20` instead of `>=22` leaves us with an ~1-year runway before Node 20 reaches EOL (2026-04-30). We'll need another bump then.
  **Mitigation:** The `runtime` spec introduced here makes that future change a simple delta rather than another project-wide archaeology expedition. Accept the shorter runway in exchange for a wider current user base.

## Migration Plan

1. Land this change as a single atomic edit across the five files (sequential, per tasks.md).
2. Tag the release with a minor version bump (or major if a v1 is imminent) and call out the minimum Node bump in release notes as a **BREAKING** change.
3. No rollback plan beyond git revert — the change is isolated to declarative config and docs. If an end-user regression is discovered post-release, revert `engines.node` and `tsup.target` together (the D2 invariant).
4. No data migration, no deployment coordination. This is a package metadata change.

## Open Questions

- Should we add a GitHub Actions workflow in the same change to actually exercise Node 20 (and optionally 22) in CI? The repo currently has **no** `.github/workflows/` directory, so this would be net-new scope. **Current answer:** out of scope for this change — add CI as its own change so its review isn't bundled with a runtime bump.
- Should we also bump `@types/node` from `^25.5.2` (which tracks Node 25) to a `^20` line to match the runtime? **Current answer:** no — `@types/node` versions are tracked against the latest Node, not the minimum. The current `^25.5.2` is correct for dev-time types and does not affect runtime compatibility. Leaving unchanged.
