## 1. Deduplicate shared helpers (pure code motion)

- [ ] 1.1 Create `src/utils/text.ts` exporting `truncateText(value: string, maxWidth: number): string` with the current implementation (from `ResponseView.tsx`, which is identical to the copy in `RequestList.tsx`).
- [ ] 1.2 Remove the local `truncateText` from `src/components/ResponseView.tsx`; import from `../utils/text`.
- [ ] 1.3 Remove the local `truncateText` from `src/components/RequestList.tsx`; import from `../utils/text`.
- [ ] 1.4 Add `src/utils/text.test.ts` covering: `maxWidth <= 0` → `''`; `value.length <= maxWidth` → `value`; `maxWidth === 1` → `'…'`; normal truncation yields `value.slice(0, maxWidth - 1) + '…'`.
- [ ] 1.5 Run `npm run build && npm test && npm run lint`; confirm green.
- [ ] 1.6 Add `isJsonString(value: string): boolean` to `src/utils/colors.ts`, reusing the existing implementation from `src/utils/scroll.ts`.
- [ ] 1.7 Update `src/utils/scroll.ts` to import and use `isJsonString` from `./colors` (drop the local copy).
- [ ] 1.8 Remove the `isJson` helper from `src/components/ResponseView.tsx`; import `isJsonString` from `../utils/colors`; update call sites.
- [ ] 1.9 Add unit tests for `isJsonString` in `test/colors.test.ts` (or wherever JSON-helper tests live): empty/whitespace → `false`, invalid JSON → `false`, valid object/array/primitive JSON → `true`.
- [ ] 1.10 Run `npm run build && npm test && npm run lint`; confirm green.

## 2. Introduce the response-layout ledger

- [ ] 2.1 Create `src/core/responseLayout.ts` with:
  - `type VisualSection` discriminated union (`status | header | separator | body`) carrying `visualLines: ColorSegment[][]` (and `rawBodyIndex: number` on body sections).
  - `interface ResponseLayout { sections: VisualSection[]; totalVisualLines: number; bodyStartVisualIndex: number; bodyVisualStart: number[] }`.
  - `formatStatusLine(response: ResponseData): ColorSegment[]` returning the 3-segment structure (gray prefix, status-code color, gray duration suffix).
  - `computeResponseLayout(options: { response: ResponseData; verbose: boolean; rawMode: boolean; wrapMode: WrapMode; contentWidth: number; formattedBody: string }): ResponseLayout` — consumes a pre-formatted body (do NOT call `formatResponseBody` inside).
- [ ] 2.2 Internal implementation notes for 2.1:
  - Build status segments via `formatStatusLine`; in `wrap` mode, call `wrapColorizedSegments(segments, contentWidth)` to derive `visualLines`; in `nowrap` mode, emit a single visual line of those segments (consumer handles truncate/shift).
  - For verbose headers, build per-header `ColorSegment[]` in gray and wrap similarly in `wrap` mode; in `nowrap` mode, emit a single visual line of the header segments.
  - Separator is a single visual line of `{text: '─'.repeat(contentWidth), color: 'gray'}`.
  - For each raw body line, in `wrap` mode and `isJsonBody` true: use `colorizeJson(line || ' ')` then `wrapColorizedSegments`. Otherwise `wrapLine(line || ' ', contentWidth)` → single-color segments. In `nowrap` mode emit a single visual line (consumer handles truncate/shift).
  - `bodyVisualStart[i]` = first visual line index of raw body line `i`; `bodyStartVisualIndex` = the visual index where the first body section starts (= sum of visual lines in status + headers + separator).
- [ ] 2.3 Create `test/responseLayout.test.ts` covering:
  - Nowrap + no-verbose + short body ⇒ `bodyStartVisualIndex === 2`, `bodyVisualStart` equals `[2, 3, 4, …]`, `totalVisualLines === 2 + bodyLines.length`.
  - Nowrap + verbose + N headers ⇒ `bodyStartVisualIndex === 2 + N`.
  - Wrap + short status + short headers + short body ⇒ identical to nowrap case.
  - Wrap + status line that exceeds `contentWidth` wraps to ≥2 visual lines ⇒ `bodyStartVisualIndex` reflects wrapped status count.
  - Wrap + verbose with one header exceeding `contentWidth` ⇒ header section emits multiple visual lines; `bodyStartVisualIndex` reflects expansion.
  - Wrap + body line 0 longer than `contentWidth` ⇒ `bodyVisualStart[1] - bodyVisualStart[0] > 1`.
  - Public shape snapshot: for a representative input, assert the keys on `ResponseLayout` and the `kind` discriminators on `sections`.
- [ ] 2.4 Port `getResponseTotalLines` in `src/utils/scroll.ts` to delegate to `computeResponseLayout(...).totalVisualLines`. Keep the exported signature; adjust callers that supply `response.body` vs. the formatted body (`formatResponseBody` called at the layer that has `rawMode`).
- [ ] 2.5 Run existing `test/scroll.test.ts` (and all others); confirm green. No behavior change expected.

## 3. Fix dispatcher / reducer to use ledger-derived visual indices

- [ ] 3.1 Change action payloads in `src/core/types.ts`:
  - `CONFIRM_SEARCH`: replace `headerOffset: number` with `firstMatchVisualIndex?: number` (undefined when `searchMatches` is empty), keep `maxOffset`.
  - `NEXT_MATCH`: replace `headerOffset: number` with `targetVisualIndex: number`, keep `maxOffset`.
  - `PREV_MATCH`: replace `headerOffset: number` with `targetVisualIndex: number`, keep `maxOffset`.
- [ ] 3.2 Update `computeSearchScrollOffset` in `src/core/reducer.ts` to accept a `visualIndex: number` directly (rename the first param from `bodyLineIndex` to `visualIndex`); the implementation reduces to `Math.min(Math.max(0, visualIndex), maxOffset ?? visualIndex)` semantics equivalent to today's clamp. Export a second helper only if needed.
- [ ] 3.3 Update `CONFIRM_SEARCH`, `NEXT_MATCH`, `PREV_MATCH` handlers in `src/core/reducer.ts` to consume the new payloads.
- [ ] 3.4 Update `src/app.tsx` dispatch sites (lines ~156, ~227, ~232 in the current tree):
  - Compute `layout = computeResponseLayout({...})` once per relevant effect/callback, gated on `state.response != null`.
  - On `/` Enter (`CONFIRM_SEARCH`): compute matches against `formattedBody` → map matches to visual indices → dispatch `firstMatchVisualIndex = matches.length > 0 ? layout.bodyVisualStart[matches[0]] : undefined`.
  - On `n` / `N`: compute the target raw index from `(currentMatchIndex ± 1) mod matches.length` → dispatch `targetVisualIndex = layout.bodyVisualStart[matches[target]]`.
  - Ensure `contentWidth` is derived consistently with `ResponseView` (use `getResponseContentWidth(stdout.columns || DEFAULT_TERMINAL_COLUMNS)`).
- [ ] 3.5 Update `test/search.test.ts`:
  - Replace `headerOffset: N` literals in existing tests with `firstMatchVisualIndex: N+offset` / `targetVisualIndex: N+offset` as appropriate; the reducer-only tests keep a simple numeric contract.
  - Add new reducer tests that use `computeResponseLayout` to derive `firstMatchVisualIndex` / `targetVisualIndex` and verify scroll correctness for: wrap + long status; wrap + verbose + long header; wrap + wrapped preceding body line.
- [ ] 3.6 Run full test suite; confirm green.

## 4. Collapse `ResponseView` to a single-pipeline renderer

- [ ] 4.1 Inside `ResponseView`, replace the three-branch `if (wrapMode === 'wrap') … else if (horizontalOffset > 0) … else …` body with:
  - Compute `layout = computeResponseLayout({...})` using `formattedBody` and current props.
  - Determine `transform: LineTransform` from (`wrapMode`, `horizontalOffset`): `{kind:'pass'}` in wrap mode; `{kind:'shift', offset, maxWidth}` when `horizontalOffset > 0`; `{kind:'truncate', maxWidth}` otherwise.
  - Flatten `layout.sections.flatMap(s => s.visualLines)` into a single array of `ColorSegment[]`, apply `transform` per visual line, emit one `<Text>` per visual line. Preserve the segmented colors produced by the ledger (this fixes the dead `if (index === 0)` branch — the gray `HTTP/1.1 ` prefix rides along as a segment).
  - For `shift` transform: concatenate segments to a flat string, apply `shiftLine`, re-emit as a single-color `<Text>` (matching today's behavior — horizontal shift intentionally loses per-segment colors, documented in the existing comment).
  - For `truncate` transform: trim each visual line's flat text via `truncateText(contentWidth)`, re-emit with segments preserved when they fit, single-color otherwise.
- [ ] 4.2 Drive match decoration from the ledger:
  - Build `currentMatchVisualIndex = searchMatches.length > 0 ? layout.bodyVisualStart[searchMatches[currentMatchIndex]] + 0 : -1`.
  - Build `matchVisualIndices = new Set(searchMatches.map(i => layout.bodyVisualStart[i]))`.
  - Preserve the existing `►` / `·` rendering and color choices.
  - Remove the `headerOffset = 1 + headerCount + 1` arithmetic from `ResponseView`.
- [ ] 4.3 Remove now-unused private helpers `renderJsonLine`, `renderWrappedJsonLine`, `shiftLine` (or move any still-needed variants to `src/utils/wrap.ts` / `src/utils/text.ts` if they're genuinely reused).
- [ ] 4.4 Keep the 17-prop interface unchanged (non-goal per proposal); only the function body changes.
- [ ] 4.5 Run full test suite; confirm green. Run `npm run build` to verify tsup output.

## 5. Add wrap-mode integration test for search marker placement

- [ ] 5.1 Create `test/integration/response-search-wrap.test.tsx` following the patterns in `test/helpers/integration.tsx`:
  - Render `<App>` with a mocked executor that returns a response containing (a) a verbose header longer than `contentWidth` (e.g., synthetic `x-trace-id` 120 chars) and (b) a body line longer than `contentWidth` before the match line.
  - Press `Enter` to send the request; wait for the response.
  - Press `v` to enable verbose; `w` to enable wrap.
  - Press `/`, type a query matching a known body line, press `Enter`.
  - Assert the `►` character appears on the line whose text contains the search query in `lastFrame()` output. (Use a line-by-line scan of `lastFrame()` to find the `►`-prefixed line and assert it contains the query substring.)
- [ ] 5.2 Add a negative test: with the same setup but wrap disabled, confirm the marker still lands correctly (regression guard that the refactor didn't break nowrap).
- [ ] 5.3 Run `npm test` (integration + units); confirm green.

## 6. Final verification and cleanup

- [ ] 6.1 Run `npm run build && npm test && npm run lint && npm run format` one last time; confirm all green.
- [ ] 6.2 Grep the repo for lingering `1 + headerCount + 1` or `headerOffset` scalar arithmetic tied to search — confirm no stale call sites remain.
- [ ] 6.3 Grep the repo for duplicate `truncateText` / `isJson` / `isJsonString` / status-line template literals — confirm each has exactly one definition and all call sites import it.
- [ ] 6.4 Manual smoke test: run `httptui` against a sample `.http` file with a long `Set-Cookie`-style header, enable verbose + wrap, run `/foo` against a body value, confirm `►` visually lands on the matching line and `n`/`N` navigate correctly.
- [ ] 6.5 Run `openspec validate fix-response-view-search-and-render --strict` (or equivalent) to confirm the change is archive-ready.
