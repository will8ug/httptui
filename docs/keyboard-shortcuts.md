# Keyboard Shortcuts

While a panel is fullscreen (`f`), only navigation and keys relevant to the visible panel are active; all other shortcuts are disabled until you leave fullscreen.

## General

| Key | Action |
|-----|--------|
| `?` | Toggle help overlay |
| `Escape` | Close current overlay / Cancel in-flight request / Dismiss search results / Exit fullscreen (when the response panel is fullscreen with active search results, clear the search first, then press Escape again to exit) |
| `q` | Dismiss search results when shown, otherwise quit application (while fullscreen, quit is disabled; leave fullscreen or use `Ctrl+C` to exit) |

## Navigation

| Key | Action |
|-----|--------|
| `↑` / `k` | Previous request / Scroll up |
| `↓` / `j` | Next request / Scroll down |
| `←` / `h` | Scroll focused panel left |
| `→` / `l` | Scroll focused panel right |
| `g` | Jump to top of focused panel |
| `G` | Jump to bottom of focused panel |
| `0` | Jump to horizontal start |
| `$` | Jump to horizontal end |
| `Tab` | Switch focus between panels |

## Request

| Key | Action |
|-----|--------|
| `Enter` | Send selected request (not while a panel is fullscreen) |
| `R` | Reload file from disk |
| `o` | Open a different .http file |
| `E` | Switch environment |
| `S` | Export requests to a new .http file |
| `s` | Save response to file |
| `y` | Copy request as curl |
| `p` | Paste curl to request list |

## Display

| Key | Action |
|-----|--------|
| `v` | Toggle verbose mode (show/hide headers); only when the response panel is fullscreen or no panel is fullscreen |
| `r` | Toggle raw mode (no JSON formatting); only when the response panel is fullscreen or no panel is fullscreen |
| `w` | Toggle text wrapping; only when the response panel is fullscreen or no panel is fullscreen |
| `d` | Toggle request details panel (no-op while fullscreen) |
| `f` | Toggle fullscreen |

## Search

| Key | Action |
|-----|--------|
| `/` | Search response body (only when the response panel is fullscreen or no panel is fullscreen) |
| `n` | Go to next match (only when the response panel is fullscreen or no panel is fullscreen) |
| `N` | Go to previous match (only when the response panel is fullscreen or no panel is fullscreen) |
| `Escape` | Dismiss search results |
| `q` | Dismiss search results when shown, otherwise quit (while fullscreen, dismisses results but does not quit) |

## Edit

| Key | Action |
|-----|--------|
| `e` | Edit a request in-session |
| `Shift+Tab` | Switch editor tab |
| `Ctrl+S` | Commit edit or save to source file |
| `Ctrl+A` | Jump to start of line |
| `Ctrl+E` | Jump to end of line |
| `Ctrl+G` | Edit requests in external editor (`$EDITOR` or config `editor`) |

## Related

- [Editing](editing.md) — Edit requests in-session or in your `$EDITOR`.
- [Environments](environments.md) — Register and switch environments at runtime.
- [Saving](saving.md) — Write edits back to the source file or export a new `.http` file.