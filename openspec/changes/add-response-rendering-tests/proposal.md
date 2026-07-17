## Why

Response rendering is the most bug-prone area of the codebase — the archive holds 7+ fix changes targeting it (`fix-response-height-layout`, `fix-details-panel-height`, `request-details-scrolling`, `fix-request-details-horizontal-overflow`, `fix-response-view-search-and-render`, `fix-response-horizontal-scroll-bounds`, `scroll-right-boundary`) — yet the components that own this logic have no direct tests. `ResponseView` (218 lines: loading/error/empty/response branches, search markers, search bar, wrap/shift/truncate slicing), `RequestDetailsView` (138 lines: per-line shift/truncate assembly), and `StatusBar` (96 lines: width budgeting, three panel-specific status formats, transient/env/INSECURE indicators) are exercised only indirectly through a handful of integration smoke tests. A refactor of line slicing or marker placement could break the display with all 600+ tests green.

## What Changes

- Add `test/components/ResponseView.test.tsx`: direct component tests for the four content branches (loading spinner, error message, empty prompt, response body), raw and verbose modes, wrap vs nowrap slicing, horizontal shift, scroll slicing, search match markers (`►`/`·`), and both search bar states (input and result display).
- Add `test/components/RequestDetailsView.test.tsx`: direct component tests for the method+URL line, headers, formdata fields, body, omission of empty sections, truncation vs horizontal shift, and scroll slicing.
- Add `test/components/StatusBar.test.tsx`: direct component tests for the shortcut bar, per-panel status text (requests/details/response), the no-response status variant, transient message, environment name, and INSECURE indicator.
- Reuse existing test helpers (`createMockResponse`, `longResponse`, `compactJsonResponse` from `test/helpers/responses.ts`; `createRequest` from `test/helpers/requests.ts`) and the established `render()` + `lastFrame()` pattern from `RequestList.test.tsx` and `EnvSelectOverlay.test.tsx`.
- No changes to production code (`src/**`). No dependency changes. No test deletions.

## Capabilities

### New Capabilities
- `component-tests`: Direct ink-testing-library component tests for the response-rendering components (`ResponseView`, `RequestDetailsView`, `StatusBar`), codifying rendering behavior that integration tests cannot reach because it requires precise prop control over loading state, errors, scroll offsets, search state, and content width.

### Modified Capabilities
<!-- None. No spec-level behavior changes; this change adds tests only. -->

## Impact

- **New files**: `test/components/ResponseView.test.tsx`, `test/components/RequestDetailsView.test.tsx`, `test/components/StatusBar.test.tsx`.
- **Modified files**: none.
- **No `src/**` files touched.** No dependency changes (`vitest` and `ink-testing-library` are already devDependencies). No config changes (`vitest.config.ts` already includes `test/**/*.test.tsx`).
- **Deliberately not covered**: `Layout.tsx` — a purely structural shell (panel composition, fullscreen branching) already exercised by the navigation, toggles, and fullscreen integration tests; direct assertions on `<Box>` dimensions would be brittle without adding behavioral coverage.
