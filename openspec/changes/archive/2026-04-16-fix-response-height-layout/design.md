## Context

The request-details-panel feature introduced a layout change in `Layout.tsx` that wraps the right column in a `flexDirection="column"` Box to accommodate the optional detail panel above the response view. This caused two problems:

1. **ResponseView's `visibleHeight` used global `stdout.rows`**: The calculation `visibleHeight = rows - 5` didn't account for the ResponseView's own chrome (2 border rows + 1 title row) or the space consumed by RequestDetailsView when visible. Ink has no `overflow: hidden`, so excess content lines overflowed the box, pushing the title out of the visible terminal area.

2. **`height="100%"` on the inner wrapper Box**: The wrapper around `{right}` had `height="100%"` which resolved to the parent column's full height, ignoring the space already taken by the detail panel above it. This caused the ResponseView to claim more vertical space than available.

Both issues manifested as the "Response" and "Request Details" titles disappearing when rendering large response bodies. Small responses worked because the content fit within the incorrectly-sized container.

## Goals / Non-Goals

**Goals:**
- Restore correct layout rendering for both the response view and request details panel titles regardless of response body size
- Ensure content line counts respect the actual available space, accounting for all layout components

**Non-Goals:**
- Changing the overall Layout component structure
- Adding overflow clipping to Ink (not supported by the framework)

## Decisions

### 1. Calculate `visibleHeight` from actual available space

**Decision**: Replace the hardcoded `rows - 5` in ResponseView with `availableHeight - 3`, where `availableHeight` is passed as a prop from App and accounts for the status bar and detail panel height.

**Rationale**: The previous calculation used global terminal rows without subtracting the space consumed by other layout elements. Since Ink has no overflow clipping, the only way to prevent content from pushing titles out of view is to limit the rendered content to fit the actual available space.

### 2. Add `getDetailPanelHeight` utility

**Decision**: Create a utility function in `src/utils/layout.ts` that mirrors RequestDetailsView's line-counting logic to compute its total rendered height (content lines + 2 border rows).

**Rationale**: App.tsx needs to know the detail panel's height to compute the remaining space for ResponseView. Extracting this as a pure function avoids duplicating the line-counting logic and keeps the calculation testable.

### 3. Remove `height="100%"` from the inner wrapper Box in Layout

**Decision**: Use only `flexGrow={1}` (without `height="100%"`) on the `<Box>` wrapping `{right}` in Layout.tsx.

**Rationale**: With `height="100%"`, Yoga resolved the wrapper to the parent column's full height, ignoring the detail panel's space. With `flexGrow={1}` alone, Yoga correctly allocates only the remaining space after the detail panel.

**Alternatives considered**:
- *Only render the column structure when detailPanel is present*: Conditional rendering with duplicate JSX — added complexity for no benefit.
- *Adding `height="100%"` to the wrapper (initial attempt)*: Didn't solve the problem because `height="100%"` resolves to the parent's full height, not the remaining space.

## Risks / Trade-offs

- **[Low risk]** The `getDetailPanelHeight` utility duplicates RequestDetailsView's line-counting logic as a pure function. If the component's rendering logic changes, the utility must be updated in sync. This is acceptable for a small, stable component.