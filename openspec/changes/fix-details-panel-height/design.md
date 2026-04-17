## Context

The `request-details-scrolling` change introduced slice-based rendering in `RequestDetailsView`: build all content lines, then show `allLines.slice(scrollOffset, scrollOffset + visibleHeight)`. This replaced the old truncation-budget approach that limited rendered lines to fit within `maxHeight`.

Two problems emerged:
1. When `scrollOffset + visibleHeight > allLines.length`, the slice returns fewer lines, causing the Ink Box to shrink and the layout to jump.
2. `getDetailPanelHeight()` still simulates the old truncation budget to compute the panel's height allocation for Layout, but the component no longer uses that budget. The two models are out of sync.

## Goals / Non-Goals

**Goals:**
- Stable panel height during scrolling — the number of visible lines never changes for a given request
- Simplify `getDetailPanelHeight` to match the new rendering model
- Keep the content-driven height behavior (panel adapts to content size, capped at `maxContentLines`)

**Non-Goals:**
- Changing the scroll UX or key bindings
- Changing the `maxContentLines` value (stays at 10)

## Decisions

### 1. Clamp scroll offset in the component

**Decision**: In `RequestDetailsView`, clamp `scrollOffset` before slicing: `const clampedOffset = Math.min(scrollOffset, Math.max(0, totalLines - visibleHeight))`. When `totalLines <= visibleHeight`, `clampedOffset` is always 0.

**Rationale**: This ensures `slice(clampedOffset, clampedOffset + visibleHeight)` always returns exactly `min(totalLines, visibleHeight)` lines. The panel height stays constant for a given request.

### 2. Simplify getDetailPanelHeight

**Decision**: Replace the truncation-budget algorithm with: compute total content lines (title + method/URL + separator + headers + header separator + body lines), then return `min(totalContentLines, maxContentLines) + BORDER_ROWS`.

**Rationale**: The old function simulated which lines would be shown/truncated. That simulation is no longer needed — the component shows `min(all, max)` lines. The height calculation should match.

**Signature change**: `getDetailPanelHeight(totalContentLines: number, maxContentLines: number)` — the caller computes total content lines and passes a single number instead of separate `headerCount` and `bodyLineCount`.

## Risks / Trade-offs

- **[Caller change]** → `app.tsx` needs to compute `totalContentLines` instead of passing `headerCount`/`bodyLineCount` separately. Minimal change.
- **[Test updates]** → Tests for `getDetailPanelHeight` need to use the new signature. Small scope.
