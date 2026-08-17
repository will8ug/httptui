# Editing

httptui offers two ways to edit requests: in-session editing inside the TUI, and handing off to your preferred external editor.

## In-session editing (`e`)

Press `e` on the selected request to open the edit overlay. It shows three tabs — URL, headers, and body — pre-filled with the request's current content.

- **`Shift+Tab`** cycles through the URL, headers, and body tabs.
- Type to insert text; the arrow keys, `Backspace`, and `Delete` move the cursor and delete characters.
- **`Ctrl+A`** / `Ctrl+E` jump to the start / end of the current line.
- **`Ctrl+S`** commits the edit back to the request.
- **`Escape`** cancels. If the buffer has unsaved changes, the first `Escape` shows `Press Esc again to discard changes`; press it again within a moment to confirm discarding.

Edits are kept in memory until you save. See [Saving](saving.md) to write them back to the source file (`Ctrl+S`) or export a new `.http` file (`S`).

## External editor (`Ctrl+G`)

Press `Ctrl+G` to open the loaded source file in your preferred editor. This is useful for larger edits — reformatting a body, bulk find-and-replace, or editing many requests at once — that are easier outside the single-line overlay.

The editor command is resolved from the environment in this order:

1. `$VISUAL`
2. `$EDITOR`
3. `vi` (or `notepad` on Windows)

The external editor must block until closed — terminal editors like vim/nano do this by default; GUI editors typically need a wait flag. The value may include arguments, so `$EDITOR="code --wait"` works. httptui suspends its UI while the editor runs, and when the editor exits it compares the file's modification time: if the file changed, httptui re-reads and reloads it automatically.

Only `.http` and `.rest` files can be handed off to an external editor; other formats show a notice instead. If you have unsaved in-session edits, you are prompted to confirm discarding them before the handoff.

## Related

- [Saving](saving.md) — Write edits back to disk.
- [.http File Format](file-format.md) — Request syntax, headers, and variables.
