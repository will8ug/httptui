## Context

The `httptui` project has 15 test files totaling ~3,757 lines. 7 of those files (~2,555 lines, 68% of test code) copy-paste reducer and state initialization logic from `src/app.tsx` rather than importing it. The real `reducer` function (~440 lines) and `createInitialState` (~30 lines) are private to `app.tsx` — not exported — so tests re-implement fragments locally. This creates a dual source of truth where tests verify a local fiction that can drift from production code. Two test files already have silently drifted (missing `searchQuery`/`searchMatches`/`currentMatchIndex`/`lastSearchQuery` fields in initial state).

The `src/app.tsx` component is a 966-line file that mixes React rendering, `useInput` keybinding dispatch, reducer logic, and layout-measurement helpers. The reducer and its dependencies are pure functions — no React, no side effects — making extraction straightforward.

## Goals / Non-Goals

**Goals:**
- Export the reducer, `createInitialState`, and supporting pure functions from a new `src/core/reducer.ts` module so tests can import them directly.
- Replace all duplicated reducer/state logic in test files with imports from the real module.
- Create shared test helper modules (`test/helpers/`) for fixtures and factories currently duplicated across 7+ files.
- Correct the `AGENTS.md` claim that `rawMode` was removed from `AppState`.

**Non-Goals:**
- Converting reducer-duplicating tests to integration (ink-testing-library) tests. That's a separate change for later.
- Adding new test cases or increasing test coverage. This refactor preserves existing test behavior.
- Changing the reducer's logic, action types, or state shape. No functional changes.
- Restructuring the component layer in `app.tsx` beyond what's needed for extraction.

## Decisions

### Decision 1: Extract to `src/core/reducer.ts` (not a test-only utility)

**Choice:** Create `src/core/reducer.ts` as a production module in `src/core/` alongside `types.ts`, `parser.ts`, `executor.ts`, etc.

**Alternative considered:** A `test/reducer.ts` re-export that only tests can import.
**Why rejected:** Test-only modules create a separate code pathway. If we're going to have a single source of truth, both production and tests should use the same module. This also enables future extraction of `useInput` dispatch logic.

**Alternative considered:** Keep reducer in `app.tsx` and add a barrel export.
**Why rejected:** `app.tsx` imports React, Ink, `fs`, `path` — it's a component file, not a logic module. The reducer's dependencies are pure (`types.ts`, `utils/`, `core/formatter.ts`). Extracting it reduces `app.tsx` from 966 to ~750 lines and makes the module graph cleaner.

### Decision 2: Move layout measurement helpers with the reducer

**Choice:** Move `getMaxRequestLineWidth`, `getMaxResponseLineWidth`, `getMaxDetailsLineWidth`, `computeVerticalMaxOffset`, `computeSearchScrollOffset`, `clamp`, `getVisibleRequestOffset`, `CLEAR_SEARCH_STATE`, and `REQUEST_SCROLL_WINDOW` into `src/core/reducer.ts`.

**Rationale:** These functions are used exclusively inside the reducer's action handlers. They are pure functions with no React or side-effect dependencies. Keeping them co-located with the reducer ensures they can be tested alongside it and imported by tests that need to compute `maxOffset` values for actions.

**Alternative considered:** Split layout helpers into `src/utils/layout-measure.ts`.
**Why rejected:** These aren't general-purpose layout utilities — they're reducer-internal computation. `getRequestContentWidth` and `getResponseContentWidth` (already in `src/utils/layout.ts`) ARE general-purpose and remain there. The `getMax*LineWidth` functions read state to compute line widths — they belong with the reducer.

### Decision 3: Shared test helpers in `test/helpers/`

**Choice:** Three files: `state.ts`, `requests.ts`, `responses.ts`.

| File | Contents |
|------|----------|
| `test/helpers/state.ts` | Re-export `createInitialState` from `src/core/reducer.ts`, plus type-safe `AppState` factory with test-friendly defaults |
| `test/helpers/requests.ts` | `makeRequests(count, opts?)`, `createRequest(overrides?)`, `createResolvedRequest(overrides?)` consolidating patterns from 4+ test files |
| `test/helpers/responses.ts` | `createMockResponse(overrides?)`, `longResponse` fixture consolidating patterns from 3 test files |

**Alternative considered:** One big `test/helpers.ts` barrel file.
**Why rejected:** Related helpers grouped by domain is more discoverable and keeps imports specific.

### Decision 4: Preserve test structure (file-per-feature), not merge

**Choice:** Keep the same 7 test files, just remove duplication within each.

**Alternative considered:** Merge small tests (e.g., `wrap-toggle.test.ts` into `wrap.test.ts`).
**Why rejected:** The current file-per-feature organization is fine. Merging would make git history harder to navigate and enlarge files unnecessarily. The duplication IS the problem, not the file count.

### Decision 5: `toRequestError` stays in `app.tsx`

**Choice:** Leave `toRequestError` in `app.tsx`. It's only used in the `App` component's error catching, not by the reducer.

**Rationale:** `toRequestError` is a component-level error handler, not reducer logic. It depends on catching `unknown` errors from `executeRequest`, which is a side-effect. It shouldn't move to the reducer module.

## Risks / Trade-offs

**Risk: Tests that were passing may fail when pointed at the real reducer** → This is the POINT of the refactor. The duplicating tests were testing fiction. Any failures reveal real bugs that the old tests couldn't catch. Fix each one individually — they should be minor (e.g., missing state fields in initial state objects).

**Risk: Extracting many functions from `app.tsx` in one PR** → All extracted functions are pure with clear signatures. The move is mechanical — cut from `app.tsx`, paste to `reducer.ts`, add exports, add imports. No logic changes. `npm run build && npm test` validates correctness after each step.

**Risk: `computeVerticalMaxOffset` and `computeSearchScrollOffset` need state + dimensions** → These functions are already pure. They take `AppState` + dimension arguments and return numbers. They'll move cleanly.

**Risk: Changing imports in 7 test files at once** → Each file's changes are mechanical: delete local reducer/createInitialState, add import. Can be done one file at a time, running tests after each.

## Migration Plan

1. Create `src/core/reducer.ts` — copy functions, add exports.
2. Update `src/app.tsx` — replace local definitions with imports.
3. Run `npm run build && npm test` — verify zero regressions.
4. Create `test/helpers/` modules.
5. Update each of 7 test files, one at a time, running tests after each.
6. Fix any test failures caused by real reducer behavior differing from fictional local behavior.
7. Update `AGENTS.md`.

**Rollback:** Each step is independently revertible. If tests fail at step 5, the failing file can be reverted while others proceed.

## Open Questions

- None. The extraction path is mechanical and well-understood from the exploration phase.