## Why

When inspecting long responses, wide JSON payloads, or detailed request headers, the split-panel layout confines content to a narrow column. Users need a way to temporarily expand a single panel to fill the entire screen (minus the status bar) so they can read content without horizontal scrolling or visual clutter.

## What Changes

- Add a **fullscreen mode** that expands the currently focused panel to occupy the full terminal width and height (minus the status bar), hiding all other panels.
- Press `f` to enter fullscreen for the focused panel; press `f` again (or `Escape`) to exit fullscreen and restore the split layout.
- Add `maximizedPanel: FocusedPanel | null` to application state — `null` means normal split view, any `FocusedPanel` value means that panel is shown fullscreen.
- Add `TOGGLE_FULLSCREEN` action to the reducer.
- Modify `Layout.tsx` to render only the maximized panel and status bar when `maximizedPanel` is set.
- In fullscreen mode, `Tab` is a no-op (no panel switching), `d` on the details panel is a no-op (can't collapse the only visible panel), `Escape` exits fullscreen, and all other keys work normally.
- When entering fullscreen, horizontal scroll offsets are reset to 0 for the maximized panel.
- The `f` shortcut appears in the help overlay but not in the status bar.

## Capabilities

### New Capabilities

- `fullscreen-panel`: Fullscreen panel mode that expands the focused panel to fill the entire terminal (minus the status bar), toggled by `f` or exited by `Escape`.

### Modified Capabilities

- `navigation`: Panel navigation is suppressed in fullscreen mode (`Tab` becomes a no-op). Escape gains an additional behavior: exiting fullscreen mode.
- `shortcuts`: New `f` shortcut entry added to the registry.
- `tui`: Layout rendering changes to support fullscreen panel display; new `maximizedPanel` state field.