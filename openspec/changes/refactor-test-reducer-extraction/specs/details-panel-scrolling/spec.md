## MODIFIED Requirements

### Requirement: Details panel scroll tests use real reducer
The test file `test/details-scroll.test.ts` SHALL import `reducer` and `createInitialState` from `src/core/reducer.ts` instead of defining local copies. The local `reducer` function, `createInitialState` function, `getVisibleRequestOffset` function, and any other logic duplicated from `src/app.tsx` SHALL be removed from the test file. All test assertions SHALL produce the same results as before (or reveal previously-masked bugs that should be fixed).

#### Scenario: details-scroll test imports real reducer
- **WHEN** `test/details-scroll.test.ts` is examined after the refactor
- **THEN** it SHALL contain `import { reducer, createInitialState } from '../src/core/reducer'` and SHALL NOT contain a local `function reducer` or `function createInitialState`

#### Scenario: details-scroll tests pass with real reducer
- **WHEN** `npm test -- details-scroll` is run
- **THEN** all tests SHALL pass (behavior preserved or bugs fixed)