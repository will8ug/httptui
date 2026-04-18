## Why

Node.js 18 reached end-of-life on 30 April 2025 and no longer receives security patches, so continuing to advertise `engines.node: ">=18"` exposes users to unpatched runtimes and blocks the project from using APIs stabilized in Node 20+ (notably `--use-system-ca`, which is the long-term fix for the TLS friction documented in `FUTURE.md`). Bumping the floor to Node 20 — the current active LTS line that's already deployed by virtually all maintained distributions — aligns httptui with the supported runtime landscape and unlocks cleaner solutions to known issues.

## What Changes

- **BREAKING**: Raise the minimum supported Node.js runtime from `>=18` to `>=20`. Installing on Node 18 will emit npm's `EBADENGINE` warning and is no longer supported.
- Update `package.json` `engines.node` from `">=18"` to `">=20"`.
- Update `tsup.config.ts` build `target` from `node18` to `node20` so emitted JavaScript can use syntax and runtime features available in Node 20 (e.g., stable `fetch`, `structuredClone`, Web Streams without flags).
- Update `AGENTS.md` to state "Node ≥20 required".
- Update `FUTURE.md` to reflect the new baseline (Node 18 no longer part of the "revisit when EOL" trigger; the `--use-system-ca` item is now blocked only on Node 20 → Node 23.8, not on Node 18).
- Add a "Requirements" section to `README.md` documenting the minimum Node.js version so end-users learn about the requirement before installing.

## Capabilities

### New Capabilities
- `runtime`: Declares the supported Node.js runtime version floor and build target so the requirement is first-class, testable, and has a stable home for future runtime-related decisions (e.g., the pending `--use-system-ca` bump tracked in `FUTURE.md`).

### Modified Capabilities
<!-- No existing spec's requirements change. All product capabilities (tui, executor,
     parser, variables, shortcuts, request-details-panel, details-panel-scrolling,
     horizontal-navigation, text-wrap-toggle) behave identically on Node 20 as on
     Node 18, so no delta specs are needed for them. -->


## Impact

- **package.json** — `engines.node` field bumped; affects `npm install` warnings for downstream users on Node 18.
- **tsup.config.ts** — build target bumped; dist output may use syntax features (e.g., top-level `await`, `Array.prototype.findLast`) that are invalid on Node 18.
- **AGENTS.md**, **FUTURE.md**, **README.md** — documentation alignment; no code impact.
- **Downstream users** — anyone still on Node 18 must upgrade to Node 20+ to install or update httptui. Existing installations on Node 18 will continue to run (npm does not hard-block on `engines`), but are unsupported.
- **CI/CD** — no CI workflows exist in this repo, so no pipeline changes are required.
- **Tests** — `test/cli-smoke.test.ts` spawns `dist/cli.js`; smoke test must pass on Node 20+ (it runs on the developer's local Node, which is already ≥20).
- **Dependencies** — no dependency bumps required. `undici@^7`, `ink@^6`, `react@^19`, and `@types/node@^25` all already require Node ≥20 in their own manifests, so this change makes httptui's declared floor consistent with its transitive requirements.
