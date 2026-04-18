## 1. Package metadata

- [ ] 1.1 In `package.json`, change `engines.node` from `">=18"` to `">=20"` (line 18).
- [ ] 1.2 Verify no other fields in `package.json` reference Node 18 (e.g., via `grep -n '18' package.json`); the only expected match after 1.1 is the test-only line for `@types/node` (unrelated).

## 2. Build configuration

- [ ] 2.1 In `tsup.config.ts`, change `target: 'node18'` to `target: 'node20'` (line 6).
- [ ] 2.2 Run `npm run build` and confirm it completes without errors and writes `dist/cli.js`.

## 3. Contributor docs

- [ ] 3.1 In `AGENTS.md`, update the line "Node ≥18 required (`engines.node`)" to "Node ≥20 required (`engines.node`)" (line 72).
- [ ] 3.2 In `FUTURE.md`, update the "Blocked by" bullet from "bumping `engines.node` from `>=18` to `>=23.8`" to "bumping `engines.node` from `>=20` to `>=23.8`" (line 15).
- [ ] 3.3 In `FUTURE.md`, update the "When to revisit" line from "When Node.js 18 and 20 reach EOL" to "When Node.js 20 reaches EOL" (line 17).

## 4. End-user docs

- [ ] 4.1 In `README.md`, add a `## Requirements` section immediately above the existing `## Installation` section stating "Node.js 20 or newer".
- [ ] 4.2 Re-read the new `Requirements` section to confirm it is discoverable (shows up in the top third of the rendered README) and does not duplicate the "Tech Stack" section at the bottom.

## 5. Verification

- [ ] 5.1 Run `npm install` on Node 20+ locally and confirm no `EBADENGINE` warnings are emitted for httptui itself (transitive warnings, if any, are pre-existing).
- [ ] 5.2 Run `npm run build` → `npm test` and confirm all tests pass, including `test/cli-smoke.test.ts` (which spawns the freshly built `dist/cli.js`).
- [ ] 5.3 Run `npm run lint` and confirm it passes (no new warnings introduced).
- [ ] 5.4 `grep -rn 'node18\|>=18\|Node ≥18\|Node >= 18' .` across the repo (excluding `node_modules`, `dist`, and `openspec/changes/archive`) and confirm zero hits remain outside intentional historical references in archived changes.

## 6. Post-merge hygiene

- [ ] 6.1 Call out "Minimum supported Node.js version is now 20 (was 18)" as a BREAKING change in the release notes / CHANGELOG entry for the next published version.
- [ ] 6.2 After the change is archived via `openspec archive drop-node-18-support`, confirm `openspec/specs/runtime/spec.md` exists and contains the three requirements defined in this change.
