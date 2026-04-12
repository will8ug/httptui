## Why

The status bar currently shows 7 shortcuts in a hardcoded string that has grown organically from the original 5. Each new shortcut (Open, Reload) was just appended, making the bar longer and harder to scan. Meanwhile, the help overlay maintains a separate `SHORTCUTS` array with 11 entries, creating two uncoordinated sources of truth that can drift apart. As more commands are added, the bar will only get more cluttered.

## What Changes

- Create a single source of truth for all keyboard shortcuts (`src/core/shortcuts.ts`) with a `showInBar` flag to control status bar visibility.
- Reduce the status bar to 6 items: `[Enter] Send  [j/k] Nav  [Tab] Panel  [v] Verbose  [q] Quit  [?] Help`.
- Move `r`, `o`, `R`, `↑/↓`, and `Escape` out of the status bar — they remain discoverable via the `?` help overlay.
- Refactor `StatusBar.tsx` to render from the shortcuts data instead of a hardcoded string.
- Refactor `HelpOverlay.tsx` to render from the same shortcuts data instead of its own `SHORTCUTS` constant.
- Update the TUI spec to reflect the new status bar layout.

## Capabilities

### New Capabilities

- `shortcuts`: A centralized shortcut registry that serves as the single source of truth for all keyboard shortcut definitions, with metadata (key label, description, visibility flags) consumed by both StatusBar and HelpOverlay.

### Modified Capabilities

- `tui`: The status bar section changes from 7 hardcoded shortcuts to 6 data-driven shortcuts. The help overlay section remains functionally the same but renders from the new shared data source instead of its own array.

## Impact

- **New file**: `src/core/shortcuts.ts` — shortcut definitions and types.
- **Modified files**: `src/components/StatusBar.tsx`, `src/components/HelpOverlay.tsx` — consume shared shortcuts data.
- **Spec update**: `openspec/specs/tui/spec.md` — status bar layout and keyboard shortcuts table.
- **No breaking changes**: All keyboard bindings remain the same; only the visible hints in the status bar change.