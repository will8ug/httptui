## ADDED Requirements

### Requirement: Exported reducer module
The system SHALL export a `reducer` function and a `createInitialState` function from `src/core/reducer.ts`. The `reducer` function SHALL have the signature `(state: AppState, action: Action) => AppState` and SHALL handle all action types defined in the `Action` discriminated union identically to the current implementation in `src/app.tsx`. The `createInitialState` function SHALL have the signature `(props: AppProps) => AppState` and SHALL produce the same initial state as the current implementation.

#### Scenario: Import reducer in test file
- **WHEN** a test file imports `{ reducer }` from `../src/core/reducer`
- **THEN** the imported `reducer` SHALL produce identical state transitions as the current inline reducer in `src/app.tsx` for all `Action` types

#### Scenario: Import createInitialState in test file
- **WHEN** a test file imports `{ createInitialState }` from `../src/core/reducer`
- **THEN** the imported `createInitialState` SHALL produce an `AppState` object with all 30 fields populated with the same defaults as the current implementation

### Requirement: Exported reducer helpers
The system SHALL export the following pure functions from `src/core/reducer.ts` that are currently private to `src/app.tsx`: `getMaxRequestLineWidth`, `getMaxResponseLineWidth`, `getMaxDetailsLineWidth`, `computeVerticalMaxOffset`, `computeSearchScrollOffset`, `clamp`, `getVisibleRequestOffset`. The constants `CLEAR_SEARCH_STATE` and `REQUEST_SCROLL_WINDOW` SHALL also be exported.

#### Scenario: Import helper in test file
- **WHEN** a test file imports `{ getVisibleRequestOffset, REQUEST_SCROLL_WINDOW }` from `../src/core/reducer`
- **THEN** the imported functions SHALL produce identical results as the current implementations in `src/app.tsx`

### Requirement: App component imports from reducer module
The `App` component in `src/app.tsx` SHALL import `reducer`, `createInitialState`, and all moved helper functions from `src/core/reducer.ts` instead of defining them inline. The component's behavior and all action handling SHALL remain identical to the current implementation.

#### Scenario: App still dispatches all actions correctly
- **WHEN** the `App` component is rendered and receives user input
- **THEN** all keybindings and action dispatches SHALL produce the same state transitions as before the extraction

#### Scenario: Build succeeds after extraction
- **WHEN** `npm run build` is run after the extraction
- **THEN** the build SHALL complete successfully with exit code 0

#### Scenario: All tests pass after extraction
- **WHEN** `npm test` is run after the extraction
- **THEN** all existing tests SHALL pass