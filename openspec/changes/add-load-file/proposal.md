## Why

httptui can only load a `.http` file at startup via the CLI argument. Once running, the only way to switch to a different file is to quit and re-launch with a new path. This is tedious when working across multiple API definition files — a common pattern for developers who organize endpoints into separate files (e.g., `users.http`, `products.http`, `auth.http`).

The existing `R` key reloads the *same* file, but there is no way to navigate to a *different* file without exiting the TUI entirely.

## What Changes

- Add an `o` key (mnemonic: "open") that enters a file-load mode.
- In file-load mode, render a text input bar at the bottom of the screen where the user types a file path.
- Support both absolute and relative paths. Relative paths resolve against the current working directory (not the directory of the currently loaded file).
- On Enter: validate the path exists, read and parse the file, replace the in-memory state (requests, variables, filePath), and exit file-load mode.
- On Escape: cancel and return to normal mode without changes.
- Show clear feedback: error message if the file doesn't exist or has no requests, confirmation message similar to "Reloaded" on success.
- Update HelpOverlay with the `o` shortcut.
- Preserve selection by request name (same strategy as `R` reload).

## Capabilities

### New Capabilities

- `tui/load-file`: Allow users to open a different `.http` file from within the running TUI by pressing `o`, typing a path, and pressing Enter.

### Modified Capabilities

- `tui`: Add file-load mode with text input bar, `o` keybinding, and path resolution.
- `tui/help-overlay`: Document the `o` shortcut.

## Impact

- **Code**: `src/core/types.ts` (new actions, new mode state), `src/app.tsx` (mode handling, input routing, file loading logic), `src/components/StatusBar.tsx` or new `FileInput` component, `src/components/HelpOverlay.tsx` (new shortcut entry).
- **Tests**: New reducer tests for `LOAD_FILE` and `CLEAR_LOAD_MESSAGE` actions. Test for file-load mode entry/exit.
- **Docs**: `README.md` — add `o` to keyboard shortcuts table.