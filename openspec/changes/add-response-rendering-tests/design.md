## Context

The response-rendering components carry significant display logic but no direct tests:

- `ResponseView` (218 lines, 17 props): four content branches (loading spinner / error / empty prompt / response), line slicing for vertical scroll, per-line transform selection (wrap pass-through, horizontal shift, truncate), search match markers (`►` current, `·` other), and a two-state search bar (active input vs result display). It delegates body formatting to `formatResponseBody()` and visual line construction to `computeResponseLayout()`.
- `RequestDetailsView` (138 lines, 7 props): assembles the full line array (title, method+URL, separator, headers, formdata fields, body) with per-line-type shift/truncate branches, then slices for scroll.
- `StatusBar` (96 lines, 12 props): width-budgeted shortcut bar, three panel-specific status formats (requests counter, details line position, response line position), and conditional transient message / env name / INSECURE indicators.

Existing coverage is indirect: `response-search-wrap.test.tsx`, `crlf-body.test.tsx`, `toggles.test.tsx`, and `search.test.tsx` exercise these components through the full app, but only smoke paths — they cannot reach the loading branch (undici is mocked, so loading is transient), the error branch (stubs always succeed), exact scroll slices, or search bar result states. The bug history (7+ fix changes in this area) shows regressions concentrate exactly in the untested slicing/marker/overflow logic.

The project already has the harness for this: `ink-testing-library` is a devDependency, and `RequestList.test.tsx` / `EnvSelectOverlay.test.tsx` establish the pattern (`render()` + `lastFrame()` + `toContain`/`not.toContain`, `afterEach(cleanup)`). Test helpers `createMockResponse`, `longResponse`, `compactJsonResponse` (`test/helpers/responses.ts`) and `createRequest` (`test/helpers/requests.ts`) are directly reusable.

## Goals / Non-Goals

**Goals:**
- Direct component tests for `ResponseView`, `RequestDetailsView`, and `StatusBar` covering the behaviors integration tests cannot reach: loading, error, empty, raw/verbose modes, scroll slicing, horizontal shift, truncation, search markers, search bar states, per-panel status text, transient/env/INSECURE indicators.
- Follow the existing component-test pattern exactly (imports, `afterEach(cleanup)`, `lastFrame() ?? ''` assertions).
- Reuse existing test helpers; introduce no new helper modules.
- Keep the full suite green with zero production-code changes.

**Non-Goals:**
- No changes to `src/**` — this is a test-only change.
- No `Layout.tsx` component tests — it is a structural shell (panel composition, fullscreen branching) already covered by navigation/toggles/fullscreen integration tests.
- No snapshot testing — inconsistent with the existing assertion style.
- No color/ANSI assertions (see Decisions).
- No coverage tooling or thresholds.
- No deletion or refactoring of existing tests.

## Decisions

### Decision 1: Direct component tests rather than more integration tests

**Choice:** Test `ResponseView`, `RequestDetailsView`, and `StatusBar` by rendering them directly with crafted props.

**Rationale:** The uncovered behaviors require prop-level control integration tests cannot provide: `isLoading` (too transient with a mocked executor), `error` (integration stubs always succeed), exact `scrollOffset`/`horizontalOffset` values, `searchMatches`/`currentMatchIndex` arrays, and `contentWidthOverride`. Direct rendering exercises the component together with its real delegated core logic.

**Alternatives considered:**
- *Expand integration tests*: rejected — cannot deterministically reach loading/error branches or pin scroll offsets; slower and flakier for pixel-level assertions.
- *Extract rendering logic from components into core and unit-test core*: rejected — refactoring production code to make it testable is out of scope and risks the very regressions this change guards against.

### Decision 2: Do not mock delegated core functions

**Choice:** Let tests call the real `formatResponseBody()` and `computeResponseLayout()`.

**Rationale:** Both are pure, fast, and already unit-tested; the historical bugs live at the seam between layout output and component slicing/marker placement. Mocking the seam would test a fiction.

**Alternatives considered:**
- *Mock `computeResponseLayout` to isolate the component*: rejected — removes coverage of the integration point where regressions actually occurred.

### Decision 3: Include `StatusBar`, exclude `Layout`

**Choice:** Add `StatusBar.test.tsx`; add no `Layout.test.tsx`.

**Rationale:** `StatusBar` has conditional rendering logic (width budgeting, three status formats, three optional indicators) and zero tests of any kind. `Layout` only composes children and branches on `maximizedPanel`/`overlay` — every branch is already exercised by integration tests, and assertions on `<Box>` dimensions would be brittle.

### Decision 4: Pin content width via `contentWidthOverride` in overflow tests

**Choice:** Pass `contentWidthOverride` explicitly in tests that assert truncation/shift behavior.

**Rationale:** Both components compute width from `useStdout()` (80 columns in the test environment). The override prop exists for exactly this purpose and makes truncation boundaries deterministic regardless of environment defaults.

### Decision 5: Assert visible text only — no color or snapshot assertions

**Choice:** Assertions use `lastFrame() ?? ''` with `toContain`/`not.toContain` on visible text and marker characters (`►`, `·`, `/`, `[1/3]`).

**Rationale:** Matches the established component-test style. Chalk's color level is 0 under the test runner, so ANSI color assertions would require environment forcing and snapshot files would be brittle against formatting reflows.

**Alternatives considered:**
- *Force chalk level and assert colors (e.g., cyanBright current-match marker)*: rejected for now — adds global setup complexity for marginal gain; noted as an Open Question.
- *Snapshot frames*: rejected — no snapshot precedent in the repo; brittle under terminal-width variation.

## Risks / Trade-offs

- **Spinner animation frames vary over time** → Assert only the static label text `Sending request`, never frame equality.
- **Height-dependent slicing is sensitive to fixture size** → Pass explicit `availableHeight`/`maxHeight` and keep fixture bodies small and counted; compute expected slices from known line counts.
- **Trailing whitespace in frames** → Assert stable substrings (`toContain`) rather than full-line equality, consistent with existing tests.
- **Tests could over-couple to internal rendering details** → Assert only user-visible text and markers that the specs (`response-search`, `text-wrap`, `request-details`) already mandate; avoid assertions on component structure.
- **New tests overlap existing integration smoke tests** → Acceptable: direct tests pin precise slices/states; integration tests continue to cover keyboard dispatch flows. No deletions.

## Migration Plan

1. Add `test/components/ResponseView.test.tsx`.
2. Add `test/components/RequestDetailsView.test.tsx`.
3. Add `test/components/StatusBar.test.tsx`.
4. Run `npm test` — all existing and new tests pass.
5. Run `npm run lint` — clean.

Purely additive; rollback is deleting the three files.

## Open Questions

- Should color assertions (e.g., cyanBright `►` marker per the `response-search` spec) be added later via forced chalk color level? Deferred — requires global test setup changes.
- If `Layout` later gains conditional logic beyond panel composition, should it gain direct tests? Revisit when such logic appears.
