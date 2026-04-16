# Spec: TUI Interface

## Overview

Interactive terminal UI built with Ink (React for CLI). Fullscreen alternate-buffer application with split-panel layout and keyboard navigation.

## Layout

```
┌────────────────────┬───────────────────────────────────────┐
│   Request List     │   Response                            │
│   (30% width,      │   (70% width,                         │
│    min 25 chars)   │    flexGrow: 1)                       │
│                    │                                        │
│   ▸ GET /users     │   HTTP/1.1 200 OK        247ms        │
│     POST /users    │                                        │
│     PUT /users/1   │   Content-Type: application/json      │
│     DEL /users/1   │   X-Req-Id: abc-123                   │
│                    │                                        │
│                    │   {                                    │
│                    │     "users": [                         │
│                    │       { "id": 1, "name": "Alice" }    │
│                    │     ]                                  │
│                    │   }                                    │
│                    │                                        │
├────────────────────┴───────────────────────────────────────┤
│ [Enter] Send  [j/k] Nav  [←/→] Scroll  [Tab] Panel  [v] Verbose  [q] Quit  [?] Help│
└─────────────────────────────────────────────────────────────┘
```

## Panels

### Request List Panel (left)
- Shows all parsed requests from the file
- Each entry: `METHOD /path` (truncated to fit width)
- Selected request highlighted with `▸` prefix and bold/color
- Scroll when requests exceed panel height (vertically with ↑/↓/j/k)
- Scroll horizontally with ←/→/h/l when content exceeds panel width
- Focused state: bordered with accent color

### Response Panel (right)
- Shows response for the last sent request
- Status line: `HTTP/1.1 {code} {text}` with timing
  - 2xx: green, 3xx: yellow, 4xx: orange, 5xx: red
- Headers section: shown only in verbose mode (dimmed text)
- Body section: pretty-printed JSON (with syntax colors) or raw text
- Scroll when content exceeds panel height (vertically with ↑/↓/j/k)
- Scroll horizontally with ←/→/h/l when content exceeds panel width
- Empty state: "Select a request and press Enter to send"
- Two display modes controlled by `wrapMode` in `AppState`:
  - **nowrap** (default): Lines are truncated to panel width with `…` ellipsis; horizontal scrolling supported
  - **wrap**: Long lines wrap at the panel boundary (word boundaries preferred); JSON syntax coloring preserved across wrapped lines; horizontal scrolling disabled; panel title shows `Response [wrap]`

#### Requirement: Response panel title visibility
The response panel SHALL render its title ("Response" or "Response [wrap]"), status line, headers, and body content correctly regardless of response body size. The bordered Box containing the response view SHALL maintain its full height within the right column layout, ensuring the title is always visible.

##### Scenario: Large response body renders title correctly
- **WHEN** a request returns a large response body (e.g., a JSON array with many entries)
- **THEN** the response panel SHALL display its "Response" title at the top of the bordered box, followed by the visible portion of the response content

##### Scenario: Response title visible with detail panel toggled
- **WHEN** the request details panel is toggled on and a large response is displayed
- **THEN** both the "Request Details" title and the "Response" title SHALL be visible in their respective bordered boxes

### Status Bar (bottom)
- Left side: keyboard shortcut hints (rendered from centralized shortcuts data, showing only items with `showInBar: true`; at most 6 shortcuts in the status bar — new shortcuts should default to `showInBar: false`)
- Right side: file name, request count
- Single line, full width
- Dimmed text

### Help Overlay
- Lists all keyboard shortcuts from the centralized `SHORTCUTS` data source (including those not shown in the status bar)
- Key displayed in yellow (padded to 8 characters), description in white
- Toggled by pressing `?`
- Closed by pressing `Escape` or `?` (closes current overlay)

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `↑` or `k` | Request list focused | Select previous request |
| `↓` or `j` | Request list focused | Select next request |
| `↑` or `k` | Response focused | Scroll response up |
| `↓` or `j` | Response focused | Scroll response down |
| `←` or `h` | Any (no overlay) | Scroll focused panel left |
| `→` or `l` | Any (no overlay) | Scroll focused panel right |
| `Enter` | Any | Send currently selected request |
| `Tab` | Any | Switch focus between panels |
| `v` | Any | Toggle verbose mode (show/hide headers) |
| `w` | Any (no overlay) | Toggle text wrapping in response panel |
| `R` | Any | Reload file from disk |
| `o` | Any | Open a different .http file |
| `?` | Any | Toggle help overlay |
| `q` | Any (no overlay) | Quit application |
| `Escape` | Help overlay open | Close current overlay |
| `Escape` | File-load overlay open | Close current overlay |

## States

### Application States
- **Idle**: Request selected, no response yet (or previous response shown). `wrapMode` persists across requests.
- **Loading**: Request in flight (show spinner in response panel). `wrapMode` is preserved.
- **Success**: Response received, displaying it. Rendering respects `wrapMode`.
- **Error**: Network/connection error (show error message in response panel). `wrapMode` is preserved.
- **File-load**: File-load overlay open, keystrokes routed to text input. `wrapMode` is preserved.

### Focus States
- **Request list focused**: bordered with accent color, keyboard controls list
- **Response focused**: bordered with accent color, keyboard controls scroll

### Horizontal Scroll States
- Both panels track a `horizontalOffset` (default `0`) that shifts content left by that many characters
- `requestHorizontalOffset` resets to `0` on `SELECT_REQUEST` and `MOVE_SELECTION`
- `responseHorizontalOffset` resets to `0` on `SEND_REQUEST`
- When `horizontalOffset` is `0`, rendering is identical to current behavior (colors preserved)
- When `horizontalOffset` is greater than `0`, colored content is flattened to plain text and shifted
- When `wrapMode` is `'wrap'`, `horizontalOffset` is treated as `0` and `←`/`→`/`h`/`l` do not scroll the response panel horizontally

## Startup

1. Parse file path from argv
2. If no file arg: show usage message and exit
3. If file doesn't exist: show error and exit
4. Parse .http file
5. If no requests found: show "No requests found in {file}" and exit
6. Render TUI with alternate screen buffer
7. First request pre-selected, response panel shows empty state

## Exit

- `q` key: clean exit, restore terminal
- `Ctrl+C`: clean exit, restore terminal
- Unhandled error: exit with error message (outside alternate buffer)

## File Reload

### Action: RELOAD_FILE

The TUI supports a `RELOAD_FILE` action that replaces the in-memory `requests` and `variables` with freshly parsed content from `filePath`. The action payload includes `requests` (ParsedRequest[]) and `variables` (FileVariable[]).

- Successful reload: re-read file from `filePath`, parse it, dispatch `RELOAD_FILE` with the new data, request list reflects new contents
- Selection preservation: if the currently selected request name still exists in the reloaded file, keep it selected; otherwise reset `selectedIndex` to 0
- Reload clears `response`, `error`, and `responseScrollOffset`

### Input: R key

The `R` key (Shift+R) triggers file reload. The reload handler reads the file at `state.filePath` using `readFileSync`, parses it with `parseHttpFile`, and dispatches a `RELOAD_FILE` action with the result. If the file read or parse fails, the handler dispatches a `REQUEST_ERROR` action with the error message.

### Reload Confirmation

The status bar displays a temporary "Reloaded" confirmation (green, bold) when the file is reloaded. The message disappears after 2 seconds via a `CLEAR_RELOAD_MESSAGE` action dispatched by `setTimeout`.

### Help Overlay

The help overlay lists `R` as the "Reload file from disk" shortcut.

## File Load

### Mode: fileLoad

The TUI supports a `fileLoad` mode in which the user can type a file path to load a different `.http` file. The mode is entered by pressing `o` and exited by pressing Enter (confirm) or Escape (cancel).

When in `fileLoad` mode, a centered pop-up overlay is displayed containing:
- A title: "Open File"
- A prompt: `File: ` followed by the current input text and a cursor character `_`
- An inline error message in red when `fileLoadError` is not null
- A hint: "Enter to load, Esc to cancel"

All keystrokes are routed to the text input instead of the normal key handler.

### Action: LOAD_FILE

The `LOAD_FILE` action replaces `requests`, `variables`, and `filePath` with data from the newly loaded file. It also clears `response`, `error`, `responseScrollOffset`, `requestScrollOffset`, sets `mode` back to `'normal'`, clears `fileLoadInput` and `fileLoadError`, and sets `reloadMessage` to `"Loaded: {basename}"`.

- Selection preservation: if the currently selected request name still exists in the new file, keep it selected; otherwise reset `selectedIndex` to 0
- Load clears `response`, `error`, and scroll offsets

### Action: ENTER_FILE_LOAD

The `ENTER_FILE_LOAD` action sets `mode` to `'fileLoad'`, clears `fileLoadInput` to `''`, and clears `fileLoadError` to `null`.

### Action: CANCEL_FILE_LOAD

The `CANCEL_FILE_LOAD` action sets `mode` back to `'normal'` and clears `fileLoadInput` and `fileLoadError`. No state changes to requests, variables, or filePath occur.

### Action: SET_FILE_LOAD_ERROR

The `SET_FILE_LOAD_ERROR` action sets `fileLoadError` to the provided error message. The mode remains `'fileLoad'` so the overlay stays open and the user can correct the path.

### Input: o key

The `o` key (lowercase) triggers file-load mode. The overlay appears and keystrokes are routed to the text input.

### Input: Enter (in file-load mode)

When the user presses Enter in file-load mode, the TUI resolves the path relative to `process.cwd()`, checks file existence with `existsSync`, reads and parses the file. If the file is not found or contains no requests, a `SET_FILE_LOAD_ERROR` action is dispatched and the overlay remains open with the input preserved. On success, a `LOAD_FILE` action is dispatched.

### Input: Escape (in file-load mode)

Pressing Escape dispatches `CANCEL_FILE_LOAD`, which closes the overlay and returns to normal mode without changing any file state.

### Load Confirmation

The status bar displays a temporary `"Loaded: {basename}"` confirmation (green, bold) when a file is loaded. The message disappears after 2 seconds via a `CLEAR_RELOAD_MESSAGE` action, reusing the same mechanism as the reload confirmation.

### Help Overlay

The help overlay lists `o` as the "Open a different file" shortcut.
