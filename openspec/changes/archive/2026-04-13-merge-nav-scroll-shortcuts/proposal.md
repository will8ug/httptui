## Why

The status bar currently shows two separate shortcut indicators for navigation: `[j/k] Nav` for vertical navigation and `[←/→] Scroll` for horizontal scrolling. Since h/j/k/l vim-style keys are already supported for both vertical and horizontal movement, these two indicators can be merged into a single `[h/j/k/l] Nav` entry. This reduces status bar clutter and presents a more unified, vim-idiomatic navigation model.

## What Changes

- Remove the separate `[←/→] Scroll` shortcut entry from the status bar display
- Replace `[j/k] Nav` with `[h/j/k/l] Nav` in the status bar to cover both vertical and horizontal navigation
- Update the shortcut registry in `src/core/shortcuts.ts` to reflect the merged entry
- No changes to actual key bindings or navigation behavior — only the status bar display text changes

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `shortcuts`: The status bar shortcut display requirement changes — instead of showing `[j/k] Nav` and `[←/→] Scroll` as two separate entries, the bar will show a single `[h/j/k/l] Nav` entry. The help overlay entries for individual keys (↑/k, ↓/j, ←/h, →/l) remain unchanged.

## Impact

- `src/core/shortcuts.ts`: Modify the `SHORTCUTS` array — merge two `showInBar: true` entries into one
- `src/components/StatusBar.tsx`: No code changes needed (it renders dynamically from `SHORTCUTS`)
- `src/components/HelpOverlay.tsx`: No code changes needed (it renders all shortcuts from `SHORTCUTS`)
- Existing tests referencing `ScrollOffset` fields are unaffected — this change is display-only
- The `shortcuts` spec needs a delta update to reflect the new status bar display requirement
