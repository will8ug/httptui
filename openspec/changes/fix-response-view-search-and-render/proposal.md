## Why

`ResponseView` has three concrete problems that compound each other:

1. **Bug — search markers and scroll-to-match land on the wrong visual lines in wrap mode.** The `headerOffset` value computed in `src/app.tsx` and `src/components/ResponseView.tsx` (as `1 + headerCount + 1`) assumes every pre-body item (status line, each verbose header, separator) occupies exactly **one** visual line, and that each raw body-line index maps to exactly **one** visual line. Both assumptions break in wrap mode: long status lines wrap, long headers wrap (e.g. `Set-Cookie`, `Content-Security-Policy`, `X-Trace-Id`), and long body lines wrap. As a consequence, the `►` / `·` decorator marks the wrong line and `responseScrollOffset` lands on a visually-incorrect row. The existing `test/search.test.ts` does not cover this because it passes `headerOffset` as a hand-chosen literal.
2. **Dead / regressed code in wrap-mode status rendering.** The `statusVisualLines.forEach` block in `ResponseView.tsx` (the `wrapMode === 'wrap'` branch) has `if (index === 0) { … } else { … }` with identical bodies. The first branch was clearly intended to keep the gray `HTTP/1.1 ` prefix on the first wrapped line (matching the single-line path), but the distinction was flattened. Users in wrap mode lose the stylistic distinction when the status line wraps.
3. **Structural duplication driving both symptoms.** The response-body rendering code inside `ResponseView` contains three near-identical branches (`wrap`, `horizontalOffset > 0`, plain) that each re-implement status / headers / separator / body rendering. The status-line template string `` `HTTP/1.1 ${code} ${text}  ${ms}ms` `` appears four times across the file plus `src/utils/scroll.ts`. The visual-line math that exists correctly in `src/utils/scroll.ts#getResponseTotalLines` is duplicated — and broken — in the search mapping code. Unifying the branches around a single per-line transform strategy eliminates the duplication and makes the visual-line accounting live in exactly one place, which is what fixes (1) without adding a fourth copy of the math.

Fixing them together is cheaper than fixing them separately: the refactor in (3) creates the single visual-line ledger that (1) needs, and the same unified status renderer is where (2) is correctly restored.

## What Changes

- Fix the wrap-mode visual-line miscount for search marker decoration and scroll-to-match:
  - Introduce a single visual-line layout computation used by both the renderer and the action dispatcher (`CONFIRM_SEARCH` / `NEXT_MATCH` / `PREV_MATCH`). The mapping `rawBodyLineIndex → firstVisualLineIndex` SHALL account for wrapped status, wrapped verbose headers, and wrapped body lines.
  - `app.tsx` SHALL derive `headerOffset` (and match-visual indices) from this ledger instead of from `1 + headerCount + 1`.
  - `ResponseView` SHALL decorate the `►` / `·` prefix using the same ledger rather than `searchMatches[i] + headerOffset` arithmetic.
- Restore the gray `HTTP/1.1 ` prefix on the first wrapped status line in wrap mode (remove the dead `if/else` branch and render the first wrapped line with the gray-prefix-plus-colored-code style, matching the non-wrapped path).
- Collapse the three rendering branches (`wrap`, `horizontalOffset > 0`, plain) inside `ResponseView` into a single pipeline that:
  - Emits structured sections (status / headers / separator / body) once,
  - Applies a per-section `LineTransform` strategy (wrap / h-shift / truncate) to each section,
  - Produces a flat `responseLines` array with preserved per-line visual-index metadata for match decoration.
- Deduplicate shared helpers:
  - Extract `truncateText` (currently duplicated verbatim in `ResponseView.tsx` and `RequestList.tsx`) into `src/utils/text.ts`.
  - Consolidate the status-line template (four copies across `ResponseView.tsx` and `src/utils/scroll.ts`) into one `formatStatusLine(response)` helper, colocated with the visual-line ledger.
  - Replace `isJson` in `ResponseView.tsx` with the existing `isJsonString` from `src/utils/scroll.ts` (or lift and export a single canonical version).
- Expand test coverage so the mapping bug cannot silently regress:
  - Unit tests for the new visual-line ledger covering wrap + long header, wrap + long status, wrap + long body.
  - A reducer-level test that computes `headerOffset`/ledger from the actual production formula (not a literal) and verifies scroll landing.
  - An integration test via `ink-testing-library` that renders `<App>`, enables wrap mode, runs a search over a body that wraps, and asserts the `►` marker lands on the matching visual line.

Out of scope (intentionally deferred per user request):
- 17-prop parameter list grouping on `ResponseView`
- Tautological `searchMatches.length >= 0` / redundant `lastSearchQuery` checks in `showSearchBar`
- Nested-ternary title construction
- Horizontal-scroll branch correctness audit beyond what the refactor subsumes

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `response-search`: The **"Scroll-to-match adjusts for header offset"** requirement currently specifies `responseScrollOffset = bodyLineIndex + headerOffset` where `headerOffset = 1 + headerCount + 1`. This formula is only correct in `nowrap` mode; it SHALL be rewritten to specify visual-line-aware mapping (using the response panel's actual visual-line layout) so that scrolling lands on the correct visual row in both `wrap` and `nowrap` modes. The **"Arrow indicator on matching lines"** requirement SHALL be clarified to require the decorator to appear on the matching **visual** line in both modes.
- `text-wrap-toggle`: The **"Wrap mode rendering in response panel"** requirement SHALL be extended with a scenario covering the gray `HTTP/1.1 ` prefix on the first wrapped status line, restoring the styling parity with the non-wrapped path.

## Impact

- Code
  - `src/components/ResponseView.tsx`: substantial restructure — single rendering pipeline, strategy-based line transform, decoration by ledger lookup instead of arithmetic, removal of duplicated helpers.
  - `src/app.tsx`: `headerOffset` derivation replaced with ledger-based computation for `CONFIRM_SEARCH` / `NEXT_MATCH` / `PREV_MATCH` dispatches.
  - `src/core/reducer.ts` and `src/core/types.ts`: `CONFIRM_SEARCH` / `NEXT_MATCH` / `PREV_MATCH` action payloads may need to carry a richer `visualLayout` description (or the scroll target pre-computed) instead of the scalar `headerOffset`. Final shape decided in `design.md`.
  - `src/utils/scroll.ts`: `getResponseTotalLines` refactored to share the same visual-line ledger implementation; `isJsonString` becomes the canonical JSON-probe helper.
  - `src/utils/text.ts` (new): `truncateText` lifted here; imported by `RequestList.tsx` and `ResponseView.tsx`.
  - `src/components/RequestList.tsx`: import of `truncateText` updated.
- Tests
  - `test/search.test.ts`: new scenarios for wrap-mode visual-line mapping; existing literal-offset tests remain passing.
  - `test/scroll.test.ts` (or equivalent): new cases for the visual-line ledger.
  - `test/integration/*.test.tsx`: new case rendering `<App>` with wrap mode + search to verify marker placement.
- APIs / external: none (internal refactor; no `.http` format changes, no CLI flag changes).
- Behavior
  - Wrap-mode search now lands correctly. Users with long headers or long body lines who previously saw off-by-N drift will see correct placement.
  - Wrap-mode status line regains the gray `HTTP/1.1 ` prefix on its first wrapped line.
  - No user-facing behavior change in `nowrap` mode (the ledger reduces to the existing `1 + headerCount + 1` arithmetic when nothing wraps).
