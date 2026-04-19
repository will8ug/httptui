# Spec: Runtime

## Purpose

Declares the Node.js runtime requirements for httptui: the minimum supported runtime version, the build target that must align with it, and the documentation surfaces that advertise it to users and contributors. This capability is concerned with toolchain and packaging, not with product behavior.

## Requirements

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

## MODIFIED Requirements (refactor-test-reducer-extraction)

## MODIFIED Requirements

### Requirement: Runtime tests use real reducer and shared helpers
The test files `test/file-load.test.ts`, `test/reload.test.ts`, `test/wrap-toggle.test.ts`, and `test/horizontal-scroll-boundary.test.ts` SHALL import `reducer` and `createInitialState` from `src/core/reducer.ts` instead of defining local copies. Each file's local `reducer` and `createInitialState` functions SHALL be removed. Shared fixtures (e.g., `sampleRequests`, `sampleVariables`) SHALL be replaced by imports from `test/helpers/requests.ts` where applicable. All test assertions SHALL produce the same results as before (or reveal previously-masked bugs that should be fixed).

#### Scenario: file-load test imports real reducer
- **WHEN** `test/file-load.test.ts` is examined after the refactor
- **THEN** it SHALL import `reducer` and `createInitialState` from `../src/core/reducer` and SHALL NOT contain local definitions of those functions

#### Scenario: file-load test no longer has stale state shape
- **WHEN** `test/file-load.test.ts` creates initial state via imported `createInitialState`
- **THEN** the state SHALL include `searchQuery`, `searchMatches`, `currentMatchIndex`, and `lastSearchQuery` fields (the fields currently missing from the local copy)

#### Scenario: reload test imports real reducer
- **WHEN** `test/reload.test.ts` is examined after the refactor
- **THEN** it SHALL import `reducer` and `createInitialState` from `../src/core/reducer` and SHALL NOT contain local definitions of those functions

#### Scenario: wrap-toggle test imports real reducer
- **WHEN** `test/wrap-toggle.test.ts` is examined after the refactor
- **THEN** it SHALL import `reducer` and `createInitialState` from `../src/core/reducer` and SHALL NOT contain local definitions of those functions

#### Scenario: horizontal-scroll-boundary test imports real reducer and helpers
- **WHEN** `test/horizontal-scroll-boundary.test.ts` is examined after the refactor
- **THEN** it SHALL import `reducer`, `createInitialState`, `getMaxRequestLineWidth`, and `getMaxResponseLineWidth` from `../src/core/reducer` and SHALL NOT contain local definitions of those functions

### Requirement: AGENTS.md correction for rawMode and test documentation
`AGENTS.md` SHALL be updated to remove the incorrect claim that `rawMode` was removed from `AppState` (it exists at `src/core/types.ts:86`). The "Gotchas" section SHALL be updated to note that 7 test files no longer duplicate reducer logic (since they now import from `src/core/reducer.ts`), and any reference to `rawMode` drift in test fixtures SHALL be removed since the shared `createInitialState` now provides the canonical state shape.

#### Scenario: AGENTS.md accurately describes rawMode
- **WHEN** a contributor reads the "Gotchas" section of `AGENTS.md`
- **THEN** it SHALL NOT claim that `rawMode` was removed from `AppState`

#### Scenario: AGENTS.md documents reducer module
- **WHEN** a contributor reads the "Architecture" or "Gotchas" section of `AGENTS.md`
- **THEN** it SHALL mention that the reducer and `createInitialState` are exported from `src/core/reducer.ts` and that tests import from this module