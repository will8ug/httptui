## Why

httptui can only load a `.http` file at startup via the CLI argument. Once running, the only way to switch to a different file is to quit and re-launch with a new path. This is tedious when working across multiple API definition files — a common pattern for developers who organize endpoints into separate files (e.g., `users.http`, `products.http`, `auth.http`).

The existing `R` key reloads the *same* file, but there is no way to navigate to a *different* file without exiting the TUI entirely.

## What Changes

- Add an `o` key (mnemonic: "open") that opens a centered pop-up overlay for entering a file path.
- The overlay shows a prompt, the typed input with a cursor, an inline error message (if any), and a hint line ("Enter to load, Esc to cancel").
- Errors (file not found, no requests in file) appear inside the overlay in red, preserving the typed path so the user can correct it and retry without dismissing.
- Support both absolute and relative paths. Relative paths resolve against the current working directory.
- On Enter: validate the path, read and parse the file, replace the in-memory state (requests, variables, filePath), close the overlay, and show a fleeting "Loaded: {filename}" confirmation in the status bar.
- On Escape: cancel and return to normal mode without changes.
- Preserve selection by request name (same strategy as `R` reload).
- Update HelpOverlay with the `o` shortcut.

## Capabilities

### New Capabilities

- `tui/load-file`: Allow users to open a different `.http` file from within the running TUI by pressing `o`, typing a path in a pop-up overlay, and pressing Enter. Inline error display allows retries without losing the typed path.

### Modified Capabilities

- `tui`: Add file-load mode with pop-up overlay, `o` keybinding, path resolution, and inline error display.
- `tui/help-overlay`: Document the `o` shortcut.

## Impact

- **Code**: `src/core/types.ts` (new actions, new mode state, fileLoadInput, fileLoadError fields), `src/app.tsx` (mode handling, input routing, file loading logic), new `src/components/FileLoadOverlay.tsx` component, `src/components/HelpOverlay.tsx` (new shortcut entry).
- **Tests**: Reducer tests for new action types, overlay rendering test.
- **Docs**: `README.md` — add `o` to keyboard shortcuts table.