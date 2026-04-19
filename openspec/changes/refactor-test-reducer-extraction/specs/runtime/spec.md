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