## Context

The horizontal-scroll clamp and the render path compute panel content width through two independent pipelines:

- **Render path (correct):** `App` → `computeLayoutMetrics` → `contentWidthOverride` props; components receive the fullscreen width while their panel is maximized, else fall back to the split width.
- **Clamp path (buggy):** `SCROLL_HORIZONTAL` / `JUMP_HORIZONTAL` in `src/core/reducers/navigation.ts` derive the clamp bound from the split-layout formulas (`getResponseContentWidth` / `getRequestContentWidth`) and never consult `state.maximizedPanel`.

The vertical axis already models the fix: `computeLayoutMetrics` produces `effectiveResponseHeight` / `effectiveDetailMaxContent` by branching on `maximizedPanel`. Widths never received the same treatment. For scale: at 200 columns the clamp overshoots by ~36 cells for response/details and ~164 cells for requests (`leftPanelWidth - 4` = 32 vs fullscreen ~196).

## Goals / Non-Goals

**Goals:**

- The horizontal clamp bound matches the width the focused panel is actually rendered at, in both layouts, for all three panels.
- A single width-selection point shared by all six clamp computations, so the render/clamp divergence cannot reappear per-panel.
- Navigation spec scenarios state observable outcomes (where the offset stops), not width formulas.

**Non-Goals:**

- Fixing the same-family vertical-axis consumers that also use the split width (`getResponseTotalLines`, `getBodyVisualStart`, `computeVerticalMaxOffset`, status-bar line count in `App.tsx`) — next change; they will consume the same helper introduced here.
- Changing the horizontal action contracts (see Decision 3).
- Revisiting `RESPONSE_PANEL_CHROME = 6` vs the true 4-cell box chrome (a 2-cell conservative slack affecting truncation in both layouts — cosmetic, independent).
- Re-clamping offsets on terminal resize (pre-existing behavior in both layouts, unchanged).

## Decisions

### Decision 1: One width helper in `layout.ts`, not six inline branches

Add `getPanelContentWidth({ panel, maximizedPanel, columns })` next to the existing width functions:

- `panel === 'requests'`: `getFullscreenRequestContentWidth(columns)` when `maximizedPanel === 'requests'`, else `getRequestContentWidth(columns)`.
- `panel === 'response' | 'details'`: `getFullscreenContentWidth(columns)` when `maximizedPanel === panel`, else `getResponseContentWidth(columns)`.

The six clamp-width lookups in `reduceNavigation` call this helper. Alternative — inlining a `maximizedPanel` ternary at each branch — was rejected: six copies of the same selection logic is exactly the duplication class that caused the bug, and the follow-up family change needs one callable selection point. The `MIN_*` content-width floors stay inside `layout.ts` (split and fullscreen functions already enforce them); the helper must not reimplement `columns - chrome` arithmetic or the floors move between layers.

### Decision 2: Guard on `maximizedPanel === panel`, not `maximizedPanel !== null`

Production never has `maximizedPanel !== focusedPanel` while non-null (`Tab` is a no-op while maximized), but reducer tests can construct such states via `createInitialState` overrides. Branching on `!== null` would apply fullscreen width to the wrong panel in those states; the equality check is safe under both.

### Decision 3: Action contracts unchanged (`columns` + default-80 preserved)

Alternative "C" — actions carrying the effective content width or a precomputed `maxOffset` — was analyzed and rejected for this change:

- ~32 action-level tests and 6 exact-shape payload assertions would need rewriting, plus a full rewrite of two navigation-spec requirements, for zero additional user-visible behavior.
- The claimed invariant ("dispatcher-owned bounds prevent width divergence") is falsified by the vertical axis: `JUMP_VERTICAL` already carries a component-computed `maxOffset` while `computeVerticalMaxOffset` still calls the split-width `getResponseTotalLines` — the same bug class, one axis over.
- The family consumers want a width helper threaded into them, not an action-shape change; the contract churn would be paid on the one path that is not how the rest gets fixed.

If a second, independent reason to stop the reducer seeing `columns` ever appears (e.g. deleting the default-80 seam deliberately), the C refactor remains available; this change's helper survives it (the dispatcher would call the same helper), with roughly 1–2 hours of test-payload rework.

### Decision 4: Spec delta rewords formulas to observable stops

The navigation spec's clamp scenarios previously pinned formulas (`max(20, columns - leftPanelWidth - 6)`, helper names, import sources). The delta replaces them with observable statements ("scrolling stops when the longest displayed line's last character meets the right edge of the panel's content area at its current layout") plus per-panel fullscreen scenarios — same precedent as the status-bar spec's observable-behavior reword. Vertical-axis scenarios that name helpers but no formulas are left for the family change.

## Risks / Trade-offs

- [Wrong width selected for a constructed `maximizedPanel ≠ focusedPanel` state] → Mitigated by Decision 2's equality guard; a dedicated test pins the behavior.
- [Helper's floor semantics diverge from the render path over time] → The helper delegates to the same `get*ContentWidth` functions the render path uses (`layout-metrics.ts` calls the same primitives); no arithmetic is duplicated.
- [Reduced spec precision — a formula was previously copy-checkable] → Traded for implementation freedom; the observable scenarios remain testable by asserting the final offset value against the helper-derived expectation in reducer tests.
- [Existing tests silently encoding the buggy bound] → None do: no current test maximizes a panel while asserting a horizontal bound; existing tests exercise split-mode bounds only, which are unchanged.
