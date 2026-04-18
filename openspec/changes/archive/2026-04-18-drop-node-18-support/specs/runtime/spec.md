## ADDED Requirements

### Requirement: Minimum Node.js runtime version

The project SHALL declare Node.js 20 as its minimum supported runtime version. The `engines.node` field in `package.json` SHALL be set to `">=20"`. Node.js 18 SHALL no longer be supported.

#### Scenario: package.json declares Node 20 as the minimum
- **WHEN** `package.json` is read
- **THEN** the `engines.node` field SHALL equal `">=20"` (or an equivalent range that excludes all versions below 20.0.0)

#### Scenario: Installing on Node 18 produces an npm engines warning
- **WHEN** a user runs `npm install -g httptui` on a Node.js 18.x runtime
- **THEN** npm SHALL emit an `EBADENGINE` warning indicating the installed Node version does not satisfy the declared engines requirement

#### Scenario: Installing on Node 20 or newer succeeds without engines warnings
- **WHEN** a user runs `npm install -g httptui` on Node.js 20.0.0 or any newer release
- **THEN** npm SHALL NOT emit an `EBADENGINE` warning for httptui's declared engines

### Requirement: Build target matches minimum runtime

The build tool SHALL emit JavaScript compatible with the declared minimum Node.js version. The `target` field in `tsup.config.ts` SHALL be set to `node20` so emitted code may use syntax and APIs available in Node 20+ but not in Node 18.

#### Scenario: tsup target aligns with engines floor
- **WHEN** `tsup.config.ts` is read
- **THEN** the `target` option SHALL equal `"node20"`

#### Scenario: Build produces output runnable on Node 20
- **WHEN** `npm run build` completes successfully on a Node 20+ developer environment
- **THEN** `dist/cli.js` SHALL execute without syntax errors on Node 20 (verified by the existing `test/cli-smoke.test.ts` smoke test)

### Requirement: Documentation advertises the supported runtime

User-facing and contributor-facing documentation SHALL state that Node.js 20 or newer is required. Specifically, `README.md` SHALL contain a "Requirements" (or equivalently-named) section listing the minimum Node.js version, and `AGENTS.md` SHALL state the same minimum in its environment/prerequisites notes.

#### Scenario: README lists Node 20 as the minimum
- **WHEN** a user reads `README.md`
- **THEN** the document SHALL state that Node.js 20 or newer is required to install and run httptui

#### Scenario: AGENTS.md lists Node 20 as the minimum
- **WHEN** a contributor reads `AGENTS.md`
- **THEN** the document SHALL state "Node ≥20 required" (or equivalent) in place of the previous "Node ≥18 required" note
