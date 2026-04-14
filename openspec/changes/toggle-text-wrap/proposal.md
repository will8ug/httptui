## Why

The response panel currently truncates long lines with `…` and requires horizontal scrolling (h/l keys) to see the full content. This is cumbersome when reading wide JSON responses or long header values — users must scroll left/right repeatedly. A toggle to wrap long lines at the panel boundary would let users read full content vertically without horizontal scrolling.

## What Changes

- Add a `w` keyboard shortcut to toggle between **truncate** mode (current behavior) and **wrap** mode
- In wrap mode, long lines break at the panel boundary instead of being truncated, so all content is visible without horizontal scrolling
- The current horizontal-scroll behavior (`←`/`→`/`h`/`l`) remains unchanged in truncate mode and is disabled in wrap mode
- The response panel visually indicates the current wrap state
- The `w` shortcut appears in the status bar and help overlay

## Capabilities

### New Capabilities
- `text-wrap-toggle`: Keyboard shortcut (`w`) and state management for toggling between truncated (horizontal-scroll) and wrapped text display in the response panel

### Modified Capabilities
- `shortcuts`: Add `w` shortcut entry (`label: "Wrap"`, `showInBar: true`, `showInHelp: true`)
- `tui`: Add wrap-mode state and rendering behavior to response panel; disable horizontal scroll in wrap mode

## Impact

- **`src/core/types.ts`**: Add `wrapMode` field to `AppState` and `TOGGLE_WRAP` to `Action` union
- **`src/core/shortcuts.ts`**: Add `w` shortcut entry
- **`src/app.tsx`**: Add `TOGGLE_WRAP` reducer case and `w` key handling in `useInput`
- **`src/components/ResponseView.tsx`**: Add `wrapMode` prop; implement line-wrapping rendering when `wrapMode === 'wrap'`; skip truncation and horizontal scroll in wrap mode
- **`src/components/StatusBar.tsx`**: Automatically picks up the new shortcut via `SHORTCUTS` data source
- **`src/components/HelpOverlay.tsx`**: Automatically picks up the new shortcut via `SHORTCUTS` data source
- **Tests**: Add unit tests for `TOGGLE_WRAP` reducer action and wrap-mode rendering logic