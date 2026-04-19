## MODIFIED Requirements

### Requirement: Search tests use real reducer
The test file `test/search.test.ts` SHALL import `reducer`, `createInitialState`, `CLEAR_SEARCH_STATE`, and `computeSearchScrollOffset` from `src/core/reducer.ts` instead of defining local copies. The local `reducer` function, `createInitialState` function, `CLEAR_SEARCH_STATE` constant, and `computeSearchScrollOffset` function SHALL be removed from the test file. All test assertions SHALL produce the same results as before (or reveal previously-masked bugs that should be fixed).

#### Scenario: search test imports real reducer
- **WHEN** `test/search.test.ts` is examined after the refactor
- **THEN** it SHALL contain `import { reducer, createInitialState, CLEAR_SEARCH_STATE, computeSearchScrollOffset } from '../src/core/reducer'` and SHALL NOT contain local definitions of those functions/constants

#### Scenario: search tests pass with real reducer
- **WHEN** `npm test -- search` is run
- **THEN** all tests SHALL pass (behavior preserved or bugs fixed)