## Context

The TUI has three scrollable panels (request list, request details, response). Vertical scrolling uses a `SCROLL` action stored in the reducer. Currently, the `SCROLL` case only clamps the offset to the lower bound (`Math.max(0, offset + delta)`) but ignores the upper bound. This means the offset can grow unboundedly past the visual maximum, causing the "stuck scroll" bug where the user must press `k` multiple times after bottoming out before visible upward scrolling resumes.

Horizontal scrolling already implements two-way clamping correctly via `SCROLL_HORIZONTAL`, which accepts a `columns` payload and computes `maxOffset` inline in the reducer.

## Goals / Non-Goals

**Goals:**
- Clamp vertical scroll offsets to `[0, maxOffset]` inside the reducer, eliminating invisible state accumulation.
- Make the `SCROLL` action pattern consistent with `SCROLL_HORIZONTAL` (action carries runtime dimension info, reducer does two-way clamping).
- Remove display-only clamping from components where the state value is now guaranteed in-bounds.

**Non-Goals:**
- Changing the `SCROLL_HORIZONTAL` action or its reducer logic (already correct).
- Changing request list vertical scrolling (`MOVE_SELECTION` uses a different mechanism).
- Altering existing scroll reset behavior (on selection change, toggle, etc.) — all reset points remain as-is.
- Changing wrap-mode line-count calculation.

## Decisions

### Decision 1: Pass `maxOffset` via action payload (not compute in reducer)

**Choice**: Add an optional `maxOffset` field to the `SCROLL` action type, computed in the `useInput` handler and passed as a payload.

**Rationale**: This mirrors how `SCROLL_HORIZONTAL` already passes `columns` as an action payload. The reducer stays pure — it doesn't need to know about terminal dimensions, content line counts, or wrap-mode rendering. Computing `maxOffset` lives alongside the existing `availableHeight` / `detailPanelHeight` calculations already in `App`, keeping view-logic in the component layer.

**Alternative considered**: Compute `maxOffset` inside the reducer. Rejected because:
- For `details`: would need to duplicate `totalLines` computation from the component.
- For `response` in `wrap` mode: would need to run `wrapLine` / `wrapColorizedSegments` inside the reducer, coupling the reducer to rendering logic.
- Breaches the principle that the reducer shouldn't depend on terminal dimensions or rendering calculations.

### Decision 2: Port `maxOffset` computation pattern for each panel

| Panel | `maxOffset` source | Computation |
|-------|---------------------|-------------|
| `details` | Already computed in `App` as `detailPanelHeight` and `totalContentLines` | `Math.max(0, totalContentLines - visibleHeight)` where `visibleHeight = detailPanelHeight` (accounting for box chrome) |
| `response` | `availableHeight` already computed, `totalLines` from response content | `Math.max(0, totalVisibleLines - visibleHeight)` where `visibleHeight = availableHeight - RESPONSE_PANEL_VERTICAL_CHROME` and `totalVisibleLines` depends on `wrapMode` / `verbose` / `rawMode` |

**Key concern**: The `response` panel `maxOffset` in `wrap` mode depends on running the wrap algorithm, which is currently inside the component. To avoid duplicating this logic, we compute `totalVisibleLines` with the same helpers used for rendering. For `nowrap` mode it's simply `body.split('\n').length + 1 (status) + (verbose ? headers : 0) + 1 (separator)`.

### Decision 3: Remove component-side clamping

**For `RequestDetailsView`**: Currently computes `clampedOffset = Math.min(scrollOffset, Math.max(0, totalLines - visibleHeight))`. After this change, the state value is guaranteed within `[0, maxOffset]`, so `clampedOffset === scrollOffset` always. Remove the `clampedOffset` variable and use `scrollOffset` directly.

**For `ResponseView`**: Currently uses `responseLines.slice(scrollOffset, scrollOffset + visibleHeight)` with no clamping at all. After this change, `scrollOffset` is guaranteed ≤ `maxOffset`, so the slice always produces `visibleHeight` lines (or fewer if near the top with short content). No component change needed beyond relying on the clamped state.

## Risks / Trade-offs

- **[Wrap-mode `maxOffset` accuracy]** → For the response panel in `wrap` mode, `maxOffset` must match the actual rendered line count. If the wrap calculation diverges from the component's rendering, the offset could be clamped to a wrong value (causing either invisible content or inability to scroll to the bottom). Mitigation: use the same `wrapLine` / `wrapColorizedSegments` utilities already shared between `App` (for `maxOffset`) and `ResponseView` (for rendering).

- **[`maxOffset` as optional field]** → The `SCROLL` action's `maxOffset` field is optional so that existing tests dispatching `SCROLL` without it still work. When `maxOffset` is undefined, the reducer should fall back to the current behavior (`Math.max(0, offset + delta)`) to avoid breaking tests. However, production code should always provide `maxOffset`. Mitigation: document the optional contract in the type definition and ensure all `useInput` dispatches always provide it.

- **[Stale `maxOffset` on resize]** → If the user resizes the terminal between keypresses, the `maxOffset` computed at dispatch time could be stale. But this is the same pattern already used by `SCROLL_HORIZONTAL` (which passes `columns` at dispatch time), and is acceptable because the next keypress will use the fresh dimensions.