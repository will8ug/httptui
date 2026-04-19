## 1. Extract reducer module

- [ ] 1.1 Create `src/core/reducer.ts` — move `reducer`, `createInitialState`, `CLEAR_SEARCH_STATE`, `REQUEST_SCROLL_WINDOW`, `clamp`, `getVisibleRequestOffset`, `getMaxRequestLineWidth`, `getMaxResponseLineWidth`, `getMaxDetailsLineWidth`, `computeVerticalMaxOffset`, and `computeSearchScrollOffset` from `src/app.tsx` into the new file. Export all functions and constants. Add necessary imports from `../utils/layout`, `../utils/scroll`, `../utils/request`, `./formatter`, and `./types`.
- [ ] 1.2 Update `src/app.tsx` — remove all moved functions/constants, add `import { reducer, createInitialState, computeVerticalMaxOffset } from './core/reducer'` (and any other moved functions used by the component). Verify the component still dispatches all actions correctly.
- [ ] 1.3 Add `AppProps` type export from `src/core/types.ts` (it's currently defined in `app.tsx` but `createInitialState` needs it in `reducer.ts`). Alternatively, move `AppProps` interface to `types.ts` or accept it as a parameter type in `reducer.ts`.
- [ ] 1.4 Run `npm run build` — verify zero build errors.
- [ ] 1.5 Run `npm test` — verify all existing tests still pass (no functional changes yet, just extraction).

## 2. Create test helper modules

- [ ] 2.1 Create `test/helpers/state.ts` — export `createInitialState(overrides?: Partial<AppState>)` that calls the real `createInitialState` from `src/core/reducer.ts` with a default `AppProps` (empty requests, empty variables, `filePath: 'test.http'`, `insecure: false`) and applies overrides via spread.
- [ ] 2.2 Create `test/helpers/requests.ts` — export `makeRequests(count, opts?)`, `createRequest(overrides?)`, `createResolvedRequest(overrides?)`. Consolidate patterns from `edge-jump.test.ts`, `horizontal-scroll-boundary.test.ts`, `details-scroll.test.ts`, `variables.test.ts`, `executor.test.ts`.
- [ ] 2.3 Create `test/helpers/responses.ts` — export `createMockResponse(overrides?)` and `longResponse` fixture. Consolidate patterns from `edge-jump.test.ts` and `executor.test.ts`.

## 3. Rewire test files (one at a time, run tests after each)

- [ ] 3.1 Update `test/wrap-toggle.test.ts` — delete local `reducer` and `createInitialState`, import from `../src/core/reducer` (real reducer) and/or `../helpers/state`. Replace local `createInitialState` call with shared version. Run `npm test -- wrap-toggle`.
- [ ] 3.2 Update `test/reload.test.ts` — delete local `reducer` and `createInitialState`, import from real modules. Replace `sampleRequests`/`sampleVariables` with shared fixtures from `../helpers/requests`. Run `npm test -- reload`.
- [ ] 3.3 Update `test/file-load.test.ts` — delete local `reducer` and `createInitialState`, import from real modules. Replace `sampleRequests`/`sampleVariables` with shared fixtures. Fix any missing state fields revealed by using the real `createInitialState` (specifically `searchQuery`, `searchMatches`, `currentMatchIndex`, `lastSearchQuery`). Run `npm test -- file-load`.
- [ ] 3.4 Update `test/horizontal-scroll-boundary.test.ts` — delete local `reducer`, `createInitialState`, `getMaxRequestLineWidth`, `getMaxResponseLineWidth`. Import from `../src/core/reducer`. Replace `longUrlRequests`/`shortUrlRequests` with shared fixtures. Run `npm test -- horizontal-scroll-boundary`.
- [ ] 3.5 Update `test/edge-jump.test.ts` — delete local `reducer`, `createInitialState`, `getVisibleRequestOffset`, `getMaxRequestLineWidth`, `getMaxResponseLineWidth`, `getMaxDetailsLineWidth`, `REQUEST_SCROLL_WINDOW`, `clamp`. Import from `../src/core/reducer`. Replace `makeRequests` with shared version. Replace `longResponse` with shared fixture. Run `npm test -- edge-jump`.
- [ ] 3.6 Update `test/details-scroll.test.ts` — delete local `reducer`, `createInitialState`, `getVisibleRequestOffset`. Import from `../src/core/reducer`. Replace `requests`/`reloadedRequests` fixtures with shared helpers. Run `npm test -- details-scroll`.
- [ ] 3.7 Update `test/search.test.ts` — delete local `reducer`, `createInitialState`, `CLEAR_SEARCH_STATE`, `computeSearchScrollOffset`. Import from `../src/core/reducer`. Replace inline `formatResponseBody` usage with direct import. Run `npm test -- search`.

## 4. Fix any revealed bugs

- [ ] 4.1 If any test fails after rewiring (expected — the real reducer may handle cases the fictional copy didn't), fix the test assertions or state setup to match real reducer behavior. Document each fix.

## 5. Update documentation

- [ ] 5.1 Update `AGENTS.md` — remove the incorrect claim that `rawMode` was removed from `AppState` (it still exists at `src/core/types.ts:86`). Update the "Gotchas" section to remove the stale `rawMode` warning about test fixtures. Add `src/core/reducer.ts` to the Architecture section describing its role (exported reducer, `createInitialState`, layout helpers). Update the "Key Patterns" section to note that the reducer is now a separate exported module, not inline in `app.tsx`. Note that tests import from `src/core/reducer.ts` instead of duplicating logic.
- [ ] 5.2 Run full test suite — `npm run build && npm test` — verify zero regressions.