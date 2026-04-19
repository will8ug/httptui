## MODIFIED Requirements

### Requirement: Edge-jump tests use real reducer
The test file `test/edge-jump.test.ts` SHALL import `reducer`, `createInitialState`, `getVisibleRequestOffset`, `getMaxRequestLineWidth`, `getMaxResponseLineWidth`, `getMaxDetailsLineWidth`, and `REQUEST_SCROLL_WINDOW` from `src/core/reducer.ts` instead of defining local copies. The local `reducer` function, `createInitialState` function, and all duplicated helper functions SHALL be removed from the test file. All test assertions SHALL produce the same results as before (or reveal previously-masked bugs that should be fixed).

#### Scenario: edge-jump test imports real reducer
- **WHEN** `test/edge-jump.test.ts` is examined after the refactor
- **THEN** it SHALL contain `import { reducer, createInitialState, ... } from '../src/core/reducer'` and SHALL NOT contain local definitions of those functions

#### Scenario: edge-jump tests pass with real reducer
- **WHEN** `npm test -- edge-jump` is run
- **THEN** all tests SHALL pass (behavior preserved or bugs fixed)