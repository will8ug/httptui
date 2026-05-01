## Why

The help overlay (`?` key) currently renders all 5 shortcut groups in a single column, resulting in a tall panel (~30+ lines) that can overflow on smaller terminal heights. A two-column layout halves the vertical height while keeping all shortcuts visible, making the overlay usable on ≥24-row terminals without scrolling.

## What Changes

- Rearrange the HelpOverlay component to render shortcut groups in two side-by-side columns
- Left column: **General**, **Navigation** (12 shortcuts total)
- Right column: **Request**, **Display**, **Search** (10 shortcuts total)
- Adjust the `SHORTCUT_GROUP_ORDER` or introduce a column-assignment mechanism so the renderer knows which groups go where
- Widen the overlay's max width to accommodate two columns (each column needs key + description space)

## Capabilities

### New Capabilities

- `help-panel-columns`: Two-column layout rendering for the help overlay, including column assignment of shortcut groups and responsive width calculation

### Modified Capabilities

_(none — no existing spec-level behavior changes, only the visual layout of the help panel)_

## Impact

- `src/components/HelpOverlay.tsx` — primary change: layout restructure from single-column to two-column
- `src/core/shortcuts.ts` — may need a column assignment constant or reorder `SHORTCUT_GROUP_ORDER` to reflect left/right grouping
- Integration tests that assert on `HelpOverlay` frame content may need updating if they match exact line positions
- No API, dependency, or breaking changes
