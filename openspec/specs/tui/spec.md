# Spec: TUI Interface

## Purpose

Interactive terminal UI built with Ink (React for CLI). Fullscreen alternate-buffer application with split-panel layout and keyboard navigation. This spec provides an overview of the layout, panels, and application lifecycle. Detailed behavior for shortcuts, navigation, search, fullscreen, wrap mode, and request details is specified in their respective specs.

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
└─────────────────────────────────────────────────────────────────────┘
```

### Panel Overview

**Request List (left):** Shows all parsed requests from the file. Each entry: `METHOD /path` (truncated to fit width). Selected request highlighted with `▸`, and scroll vertically/horizontally when content exceeds panel bounds.

**Response (right):** Shows response for the last sent request. Status line with color-coded status code, optional headers (verbose mode), and body (formatted JSON or raw text). Scroll vertically/horizontally when content exceeds panel bounds. See **text-wrap** spec for wrap mode behavior. See **response-search** spec for search behavior.

**Request Details:** Toggleable panel showing resolved request details (method, URL, headers, body). See **request-details** spec for full behavior.

**Status Bar (bottom):** Single line, full width. Left side shows keyboard shortcut hints (from centralized shortcuts, max 6 items). Right side shows file name and context-aware panel information (selected index, scroll position).

**Help Overlay:** Lists all keyboard shortcuts in a two-column grouped layout. See **shortcuts** spec for full shortcut catalog and rendering rules.

### Fullscreen Layout

When `maximizedPanel` is not `null`, the `Layout` component renders only the maximized panel at full width/height (minus one row for the status bar). All other panels are hidden. See **fullscreen-panel** spec for full behavior including keyboard bindings, state preservation, and layout calculations.

## States

### Application States
- **Idle**: Request selected, no response yet (or previous response shown)
- **Loading**: Request in flight (show spinner in response panel)
- **Success**: Response received, displaying it
- **Error**: Network/connection error (show error message in response panel)
- **File-load**: File-load overlay open, keystrokes routed to text input

### Focus States
Focus cycling via `Tab` is defined in the **navigation** spec.

## Keyboard Shortcuts

Defined in the centralized `SHORTCUTS` registry (`src/core/shortcuts.ts`). See **shortcuts** spec for the full catalog and rendering rules. See **navigation** spec for scrolling and edge-jump keybindings.

## Startup

1. Parse file path from argv
2. If no file arg: show usage message and exit
3. If file doesn't exist: show error and exit
4. Parse .http file (or Postman collection if .json)
5. If no requests found: show "No requests found in {file}" and exit
6. Render TUI with alternate screen buffer
7. First request pre-selected, response panel shows empty state

## Exit

- `q` key: clean exit, restore terminal
- `Ctrl+C`: clean exit, restore terminal
- Unhandled error: exit with error message (outside alternate buffer)

## File Reload

The `R` key triggers file reload. The reload handler reads the file at `state.filePath` using `readFileSync`, parses it with `parseHttpFile`, and dispatches a `RELOAD_FILE` action with the result. If the file read or parse fails, the handler dispatches a `REQUEST_ERROR` action with the error message.

- Selection preservation: if the currently selected request name still exists in the reloaded file, keep it selected; otherwise reset `selectedIndex` to 0
- Reload clears `response`, `error`, and `responseScrollOffset`
- The status bar displays a temporary "Reloaded" confirmation (green, bold) that disappears after 2 seconds

## File Load

The `o` key enters `fileLoad` mode, showing a centered pop-up overlay with a title, text input, optional error message, and hint. All keystrokes are routed to the text input.

- **Enter**: resolves path relative to `process.cwd()`, checks file existence, reads and parses the file. On success, dispatches `LOAD_FILE` action; on failure, sets `fileLoadError` and keeps overlay open with input preserved.
- **Escape**: dispatches `CANCEL_FILE_LOAD`, closes overlay, returns to normal mode without changing file state.
- Load confirmation: status bar displays a temporary `"Loaded: {basename}"` (green, bold) that disappears after 2 seconds.

## Requirements

### Requirement: Request list shows resolved request paths

The request-list panel SHALL resolve file, system, and environment variables against the current variable map before extracting the display path for each request. The displayed entry SHALL be `METHOD <path>` where `<path>` is the pathname (plus search string, if any) of the resolved URL. Resolution SHALL use the same merged variable map (`fileVariables` merged with the active environment's variables) used by the request-details panel and the send-request path, so that the list, the details panel, and the send path display a consistent URL.

#### Scenario: File variable resolved in request list

- **WHEN** a `.http` file declares `@baseUrl = https://api.example.com` and contains `GET {{baseUrl}}/posts`
- **THEN** the request-list entry SHALL display `GET /posts` (the pathname of the resolved URL), not `GET {{baseUrl}}/posts`

#### Scenario: Nested file variable resolved in request list

- **WHEN** a `.http` file declares `@hostname = api.example.com` and `@baseUrl = https://{{hostname}}` and contains `GET {{baseUrl}}/posts`
- **THEN** the request-list entry SHALL display `GET /posts`, demonstrating that nested file variables are resolved before display

#### Scenario: Request list reacts to environment switch

- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and an environment file loaded via `--env` or the `E` switcher defines `baseUrl = https://api.dev.com`
- **THEN** the request-list entry SHALL display the pathname of `https://api.dev.com/...` while that environment is active, and SHALL update to display the pathname of `https://api.local/...` when the user reverts to `(none)` via the environment switcher, without reloading the file

#### Scenario: Request list reacts to file reload

- **WHEN** the user presses `R` to reload the file and the reloaded file changes a variable definition (e.g. `@baseUrl` from `https://a.com` to `https://b.com`)
- **THEN** the request-list entries SHALL display pathnames resolved against the new variable values

#### Scenario: Unresolved variable preserves current display behavior

- **WHEN** a request URL contains `{{unknownVar}}` and no file or environment variable defines `unknownVar`
- **THEN** `resolveVariables` SHALL leave `{{unknownVar}}` in the URL, `new URL()` SHALL fail to parse it, and the request-list entry SHALL display `METHOD {{unknownVar}}/...` (the raw URL fallback), matching the behavior prior to this change

#### Scenario: Unresolved system variable preserves current display behavior

- **WHEN** a request URL contains `{{$processEnv DEFINITELY_NOT_SET}}` and that environment variable is unset
- **THEN** the placeholder SHALL be left in the URL, and the request-list entry SHALL display the raw URL string, matching the behavior prior to this change

#### Scenario: Request list horizontal scroll width matches rendered text

- **WHEN** the request list contains requests whose resolved path is longer or shorter than the raw URL, and the user presses `0`, `$`, `←`, or `→`
- **THEN** the horizontal scroll bounds SHALL be computed against the resolved path lengths, so the scrollable range matches what is rendered in the panel

#### Scenario: Request list resolution matches send path for dotenv

- **WHEN** a request URL contains `{{$dotenv API_HOST}}` and a `.env` file exists in the same directory as the loaded `.http` file
- **THEN** the request-list display SHALL resolve `{{$dotenv API_HOST}}` using the `.env` file in the loaded file's directory first (then CWD fallback), identical to the resolution used when the request is sent, so the displayed path matches the sent URL
