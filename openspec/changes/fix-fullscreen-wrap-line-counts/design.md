## Context

The horizontal-axis fix (`fix-fullscreen-horizontal-clamp`) left three vertical-axis consumers still deriving width from the split layout: `getResponseTotalLines` (feeding the status bar's `x/y lines` total at `App.tsx:173` and the `G` bound via `computeVerticalMaxOffset` at `reducer.ts:43`), and `getBodyVisualStart` (`input-handlers.ts:52`, feeding `n`/`N` and search-Enter scroll targets). All three matter only in wrap mode — nowrap visual counts are width-independent — and only while the response panel is maximized, since the render path already wraps at the fullscreen width via `contentWidthOverride`. The `getPanelContentWidth({ panel, maximizedPanel, columns })` helper from the previous change is the single width-selection point these consumers should adopt.

A related wrinkle: `TOGGLE_FULLSCREEN` (`toggles.ts`) resets horizontal offsets only. In wrap mode, entering fullscreen changes the visual-line total, so a stale `responseScrollOffset` can rest past the content end (blank space below content).

## Goals / Non-Goals

**Goals:**

- Every wrap-dependent vertical computation (line total, `G` bound, search-jump visual index) uses the same width the panel renders at, via `getPanelContentWidth`.
- Toggling the response panel's fullscreen cannot leave `responseScrollOffset` past the content end.
- Navigation spec's `JUMP_VERTICAL` and `Keyboard bindings` requirements state observable behavior (no helper names), consistent with the horizontal requirements' rewording.

**Non-Goals:**

- Vertical offsets of the requests/details panels on fullscreen toggle — a height concern, not wrap-width; the request list self-corrects via selection clamping and details has no wrap expansion.
- Re-clamping offsets on terminal resize (pre-existing in both layouts).
- Changing horizontal action contracts (option C, rejected in the prior change's design).

## Decisions

### Decision 1: `getResponseTotalLines` takes `contentWidth`, callers derive it

Replace the `columns` field in the option bag with `contentWidth`, mirroring `computeResponseLayout`'s option bag (the function it delegates to). Callers derive it:

- `App.tsx` (status bar total): `getPanelContentWidth({ panel: 'response', maximizedPanel: state.maximizedPanel, columns })` — the component layer already follows this pattern for heights.
- `computeVerticalMaxOffset` in `reducer.ts`: has `state` and `columns`, derives the same way.

Alternative — accepting `maximizedPanel` in the option bag and deriving internally — rejected: it would make the utility depend on panel state and diverge from `computeResponseLayout`'s established contract.

### Decision 2: `getBodyVisualStart` derives width internally

It already receives full `AppState`; switching its internal `getResponseContentWidth(columns)` to `getPanelContentWidth({ panel: 'response', maximizedPanel: state.maximizedPanel, columns })` needs no signature change and fixes both call sites (`buildMatchNavigationAction`, `handleSearchInput`) at once.

### Decision 3: `TOGGLE_FULLSCREEN` resets `responseScrollOffset` to `0`

Chosen over re-clamping to the new bound: consistent with the existing horizontal-reset semantics already specified in the fullscreen-panel spec, avoids computing wrap-dependent bounds inside the reducer, and the cost (losing the reading position on toggle) matches what already happens horizontally. Applies both entering and leaving response fullscreen. Confirmed with the user.

### Decision 4: Spec homes follow existing requirements

The status-bar line indicator turned out to be already specced (`Context-aware status text` mentions `responseTotalLines`), so it is modified in place rather than gaining a new requirement. The search-jump fix extends the existing `Scroll-to-match adjusts for visual-line layout` requirement with a layout-width clause and a maximized scenario. The `JUMP_VERTICAL`/`Keyboard bindings` rewording removes helper names (`clampScrollOffsetToCursor`, `getResponseTotalLines`, etc.) the same way the horizontal requirements were reworded, preserving every scenario name and adding one fullscreen scenario.

## Risks / Trade-offs

- [`getResponseTotalLines` signature change breaks existing callers/tests] → Only two production call sites (both updated in the same change); `test/utils/scroll.test.ts` updates are mechanical (pass explicit `contentWidth`).
- [Reset-to-0 discards the reading position on fullscreen toggle] → Accepted tradeoff (user-confirmed); matches horizontal-offset semantics; `G`/`g` provide quick repositioning.
- [Status-bar totals shift in existing tests] → Only tests that pin a wrap-mode total at a specific width could shift; nowrap totals are width-independent. Full-suite run catches any.
- [Divergence risk between `computeResponseLayout` consumers re-introduced] → All width selection now flows through `getPanelContentWidth`; the render path and these three consumers share it, so the class of bug is closed for both axes.
