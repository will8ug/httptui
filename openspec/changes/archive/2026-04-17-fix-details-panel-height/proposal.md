## Why

After the `request-details-scrolling` change, the request details panel has an unstable height when scrolling. The panel shrinks as the user scrolls down because `allLines.slice(scrollOffset, scrollOffset + visibleHeight)` returns fewer lines when the scroll offset nears the end of the content. Additionally, `getDetailPanelHeight()` still uses the old truncation-budget model to compute the panel's Layout allocation, but `RequestDetailsView` now uses a slice-based rendering model. These two calculations are out of sync.

## What Changes

- Clamp `scrollOffset` in `RequestDetailsView` so the visible line count stays constant during scrolling
- Simplify `getDetailPanelHeight()` to match the new content model: `min(totalContentLines, maxContentLines) + BORDER_ROWS`

## Capabilities

### Modified Capabilities
- `details-panel-scrolling`: Fix scroll offset clamping so the panel height remains stable during scrolling
- `request-details-panel`: Simplify height calculation to match slice-based rendering model

## Impact

- **Component**: `RequestDetailsView` — add `Math.min(scrollOffset, Math.max(0, totalLines - visibleHeight))` clamp before slicing
- **Utility**: `getDetailPanelHeight()` in `src/utils/layout.ts` — replace the truncation-budget algorithm with a simple `min(totalContentLines, maxContentLines) + BORDER_ROWS`
- **App**: `app.tsx` — update how `getDetailPanelHeight` is called (it now just needs total content line count and max)
- **Tests**: Update any tests that depend on the old `getDetailPanelHeight` behavior
