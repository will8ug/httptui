# Spec: TUI Interface

## Purpose

Interactive terminal UI built with Ink (React for CLI). Fullscreen alternate-buffer application with split-panel layout and keyboard navigation. This spec provides an overview of the layout, panels, and application lifecycle. Detailed behavior for shortcuts, navigation, search, fullscreen, wrap mode, request details, the request list, file load, and file reload is specified in their respective specs.

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

**Request List (left):** Shows all parsed requests from the file, with the selected request highlighted. See the **request-list** spec for resolved-path display and scrolling behavior.

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
- **File-load**: File-load overlay open, keystrokes routed to text input. See the **file-load** spec.

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

The `R` key reloads the current file. See the **file-reload** spec for reload semantics, selection preservation, response-state clearing, and reload errors.

## File Load

The `o` key opens the file-load overlay. See the **file-load** spec for entry, input handling, confirmation, cancellation, and error behavior.

## Requirements

### Requirement: TUI renders a split-panel layout in the alternate screen buffer

The application SHALL render in a fullscreen alternate screen buffer with two horizontally split panels — the request list at 30% of the terminal width (minimum 25 characters) and the response panel filling the remaining width — and a status bar across the bottom row. Per-panel display and scrolling behavior is specified in each panel's capability spec.

#### Scenario: Two-panel split with status bar

- **WHEN** the application starts with a loaded file
- **THEN** the request list SHALL occupy 30% of the terminal width (minimum 25 characters), the response panel SHALL fill the remaining width, and the status bar SHALL render across the bottom row

#### Scenario: Alternate screen buffer

- **WHEN** the application starts
- **THEN** the TUI SHALL render in the alternate screen buffer, restoring the previous terminal contents on exit
