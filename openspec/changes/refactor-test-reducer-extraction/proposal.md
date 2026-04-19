## Why

7 of 15 test files copy-paste the reducer and `createInitialState` from `src/app.tsx` instead of importing them. These ~530 lines of duplicated reducer logic mean tests verify a local fiction rather than production code — allowing silent drift where tests pass while the real reducer is broken. Two files (`file-load.test.ts`, `reload.test.ts`) construct initial state objects missing 4 fields (`searchQuery`, `searchMatches`, `currentMatchIndex`, `lastSearchQuery`) that exist in the real `AppState`, but TypeScript doesn't catch this because the local reducer never touches them. Additionally, `AGENTS.md` incorrectly claims `rawMode` was removed from `AppState`, when it still exists.

## What Changes

- Extract `reducer`, `createInitialState`, and layout-measurement helpers (`getMaxRequestLineWidth`, `getMaxResponseLineWidth`, `getMaxDetailsLineWidth`, `computeVerticalMaxOffset`, `computeSearchScrollOffset`, `clamp`, `getVisibleRequestOffset`, `CLEAR_SEARCH_STATE`, `REQUEST_SCROLL_WINDOW`) from `src/app.tsx` into a new `src/core/reducer.ts` module, all exported.
- Update `src/app.tsx` to import from `src/core/reducer.ts` instead of defining them locally.
- Delete the local `reducer` and `createInitialState` implementations from all 7 test files and import from `src/core/reducer.ts` instead.
- Create `test/helpers/state.ts` with a shared `createInitialState(overrides?)` that re-exports from `src/core/reducer.ts` with test-friendly defaults (empty requests array, etc.).
- Create `test/helpers/requests.ts` consolidating the 4+ divergent request-builder patterns (`makeRequests`, `createRequest`, `createResolvedRequest`) into shared factories.
- Create `test/helpers/responses.ts` consolidating `createMockResponse` and `longResponse` fixtures.
- Update all 7 test files to use shared helpers instead of local copies.
- Fix `AGENTS.md` to remove the incorrect `rawMode` claim and update test-specific notes.

## Capabilities

### New Capabilities
- `reducer-module`: Extracted reducer module (`src/core/reducer.ts`) that exports `reducer`, `createInitialState`, and supporting functions for direct import by both `App` component and tests.
- `test-helpers`: Shared test helper modules (`state.ts`, `requests.ts`, `responses.ts`) under `test/helpers/` providing factory functions to replace duplicated test fixtures.

### Modified Capabilities
- `details-panel-scrolling`: Tests currently duplicate reducer logic for `SCROLL`/`SWITCH_PANEL`/`TOGGLE_REQUEST_DETAILS`/`RELOAD_FILE`/`LOAD_FILE` actions; will import real reducer instead.
- `response-search`: Tests currently duplicate reducer logic for search actions; will import real reducer instead.
- `edge-jump-navigation`: Tests currently duplicate reducer logic for `JUMP_VERTICAL`/`JUMP_HORIZONTAL`; will import real reducer instead.
- `runtime`: Tests for file-load, reload, wrap-toggle currently duplicate reducer logic; will import real reducer instead.

## Impact

- **`src/app.tsx`**: Loses ~200 lines of function definitions (moved to `src/core/reducer.ts`). Gains import lines. Component behavior unchanged.
- **`src/core/reducer.ts`**: New file, ~200 lines. Contains the pure reducer, `createInitialState`, and layout helpers previously private to `app.tsx`.
- **7 test files**: Each loses 14–165 lines of duplicated reducer/state logic, gains 1–2 import lines. Test behavior may change slightly when bugs masked by fiction-tests are revealed.
- **3 new helper files**: `test/helpers/state.ts`, `test/helpers/requests.ts`, `test/helpers/responses.ts` — small, focused.
- **`AGENTS.md`**: Documentation corrections for `rawMode` claim and test-specific notes.
- **No public API changes. No dependency changes. No breaking changes.**