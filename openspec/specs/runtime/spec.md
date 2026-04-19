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
## MODIFIED Requirements (expand-integration-tests-and-trim-redundant-uts)

## MODIFIED Requirements

### Requirement: Trim redundant reducer-centric unit tests
Unit tests whose assertions are fully covered by new integration tests SHALL be removed from the following files. Remaining unit tests in those files SHALL continue to cover boundary math, exhaustive clamping logic, and edge cases not efficiently exercisable via integration tests.

- `test/wrap-toggle.test.ts` — Delete happy-path dispatch tests for `TOGGLE_WRAP`. Keep tests that verify invariants (e.g., "preserves other state fields").
- `test/reload.test.ts` — Delete simple "dispatch RELOAD_FILE, check requests replaced" tests. Keep name-based selection preservation, reset-to-0 when name not found, and `CLEAR_RELOAD_MESSAGE` invariant tests.
- `test/file-load.test.ts` — Delete happy-path tests for `ENTER_FILE_LOAD`, `UPDATE_FILE_LOAD_INPUT`, `SET_FILE_LOAD_ERROR`, `LOAD_FILE`, and `CANCEL_FILE_LOAD`. Keep name-based reselection, name-not-found reset, and invariant tests.
- `test/edge-jump.test.ts` — Delete tests that duplicate coverage provided by the integration tests in `test/integration/edge-jump.test.tsx`. Keep tests that verify `maxOffset` clamping, cross-panel branching, and boundary math for each panel type.

#### Scenario: wrap-toggle UT file shrinks
- **WHEN** `test/wrap-toggle.test.ts` is examined after the change
- **THEN** it SHALL contain fewer test cases than before
- **AND** the remaining tests SHALL assert on state invariants rather than simple toggle dispatch

#### Scenario: file-load UT file retains edge cases
- **WHEN** `test/file-load.test.ts` is examined after the change
- **THEN** it SHALL retain tests for name-based reselection and name-not-found edge cases
- **AND** it SHALL NOT contain tests that merely dispatch `ENTER_FILE_LOAD`/`UPDATE_FILE_LOAD_INPUT` and check a single field on the resulting state

#### Scenario: reload UT file retains name-matching logic tests
- **WHEN** `test/reload.test.ts` is examined after the change
- **THEN** it SHALL retain the name-based selection preservation test
- **AND** it SHALL retain the name-not-found reset test
- **AND** it SHALL retain `CLEAR_RELOAD_MESSAGE` invariant tests

#### Scenario: edge-jump UT file retains boundary math tests
- **WHEN** `test/edge-jump.test.ts` is examined after the change
- **THEN** it SHALL retain tests covering `maxOffset` clamping behavior for details and response panels
- **AND** it SHALL retain tests covering the `wrapMode === 'wrap'` guard on `JUMP_HORIZONTAL`
- **AND** it SHALL retain tests covering empty-requests edge cases

### Requirement: AGENTS.md documents test tier structure
`AGENTS.md` SHALL describe the three tiers of tests (pure unit / reducer unit / integration) and note the `test/integration/` directory. It SHALL reference `test/helpers/integration.ts` as the shared helper for integration tests.

#### Scenario: AGENTS.md mentions test/integration directory
- **WHEN** a contributor reads the Testing section of `AGENTS.md`
- **THEN** it SHALL mention that integration tests live in `test/integration/` and use `ink-testing-library` via `test/helpers/integration.ts`

#### Scenario: AGENTS.md describes test tiers
- **WHEN** a contributor reads the Testing section of `AGENTS.md`
- **THEN** it SHALL describe the distinction between reducer unit tests (dispatch-action, check-state) and integration tests (keypress, check-rendered-frame)