## Context

The request-details-panel feature introduced a layout change in `Layout.tsx` that wraps the right column in a `flexDirection="column"` Box to accommodate the optional detail panel above the response view. The inner Box wrapping `{right}` (the `ResponseView`) was given `flexGrow={1}` but no explicit `height`, while `ResponseView` itself uses `height="100%"` on its bordered container.

In Yoga (the Flexbox layout engine used by Ink), `height: 100%` must resolve against an ancestor with an explicit height. The previous layout had `height="100%"` on the right-column Box, so `ResponseView`'s `height="100%"` resolved correctly. The new layout replaced that with `flexGrow={1}` only, breaking the resolution chain.

This manifests as the "Response" title (and "Request Details" title when visible) disappearing when rendering large response bodies, because Yoga cannot correctly compute the bordered Box's height. Small responses still work because the content-based minimum height is sufficient to show the title.

## Goals / Non-Goals

**Goals:**
- Restore correct layout rendering for the response view title and content regardless of response body size
- Maintain the detail panel above the response view when toggled on

**Non-Goals:**
- Changing the Layout API or component structure beyond the height fix
- Addressing any other layout edge cases not related to this bug

## Decisions

### 1. Add `height="100%"` to the inner wrapping Box

**Decision**: Add `height="100%"` to the `<Box flexGrow={1}>` that wraps `{right}` in `Layout.tsx`.

**Rationale**: This restores the explicit height chain that existed before (`height="100%"` → `height="100%"` → `height="100%"`). Yoga needs an explicit height on the parent for percentage-based heights on children to resolve correctly. `flexGrow={1}` alone does not provide this.

**Alternatives considered**:
- *Only render the column structure when detailPanel is present*: This would require conditional rendering and duplicate JSX, increasing complexity for no benefit.
- *Remove `height="100%"` from ResponseView and use `flexGrow` instead*: This would require changing ResponseView's sizing strategy, which is a larger change with more risk.

## Risks / Trade-offs

- **[Minimal risk]** The fix is a single attribute addition. The `height="100%"` on the inner Box simply ensures Yoga's percentage resolution chain is intact — it does not change the visual layout when the detail panel is absent (the Box already fills available space via `flexGrow`).