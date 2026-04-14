## MODIFIED Requirements

### Requirement: Response Panel (right)
The response panel SHALL show response content for the last sent request and support two display modes controlled by `wrapMode` in `AppState`.

#### Default (nowrap) mode:
- Status line: `HTTP/1.1 {code} {text}` with timing
  - 2xx: green, 3xx: yellow, 4xx: orange, 5xx: red
- Headers section: shown only in verbose mode (dimmed text)
- Body section: pretty-printed JSON (with syntax colors) or raw text
- Lines are truncated to panel width with `…` ellipsis
- Horizontal scrolling with `←`/`→`/`h`/`l` shifts content (colors flatten to plain text when offset > 0)
- Vertical scrolling with `↑`/`↓`/`j`/`k`
- Empty state: "Select a request and press Enter to send"

#### Wrap mode (`wrapMode === 'wrap'`):
- Long lines wrap at the panel boundary instead of being truncated
- Lines break at word boundaries when possible; strings longer than `contentWidth` with no spaces break at character boundaries
- JSON syntax coloring is preserved across wrapped lines (color spans split at wrap boundaries)
- Horizontal scrolling (`←`/`→`/`h`/`l`) is disabled for the response panel
- Vertical scrolling continues to work via the visual lines array (wrapped lines produce multiple visual lines)
- Panel title shows `Response [wrap]` indicator
- Status line, headers, and separator line are also wrapped

#### Scenario: Response panel renders in nowrap mode with truncation
- **WHEN** `wrapMode` is `'nowrap'` and a response line exceeds `contentWidth`
- **THEN** the line SHALL be truncated with `…` at `contentWidth` characters
- **AND** horizontal scroll SHALL be available

#### Scenario: Response panel renders in wrap mode with line wrapping
- **WHEN** `wrapMode` is `'wrap'` and a response line exceeds `contentWidth`
- **THEN** the line SHALL wrap to the next visual line at `contentWidth`
- **AND** horizontal scroll SHALL be disabled

#### Scenario: Wrap mode title indicator
- **WHEN** `wrapMode` is `'wrap'`
- **THEN** the response panel title SHALL display `Response [wrap]`
- **WHEN** `wrapMode` is `'nowrap'`
- **THEN** the response panel title SHALL display `Response`

### Requirement: Keyboard Shortcuts

The keyboard shortcuts table SHALL include the wrap toggle shortcut.

| Key | Context | Action |
|-----|---------|--------|
| `↑` or `k` | Request list focused | Select previous request |
| `↓` or `j` | Request list focused | Select next request |
| `↑` or `k` | Response focused | Scroll response up |
| `↓` or `j` | Response focused | Scroll response down |
| `←` or `h` | Any (no overlay, nowrap mode) | Scroll focused panel left |
| `→` or `l` | Any (no overlay, nowrap mode) | Scroll focused panel right |
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

#### Scenario: w key toggles wrap mode
- **WHEN** the user presses `w` while in normal mode (no overlay open)
- **THEN** the response panel SHALL toggle between nowrap and wrap display modes

#### Scenario: Horizontal scroll keys ignored in wrap mode
- **WHEN** `wrapMode` is `'wrap'` and the response panel is focused
- **AND** the user presses `←`, `→`, `h`, or `l`
- **THEN** the response panel SHALL NOT change its horizontal offset

### Requirement: Application States

The application states SHALL include wrap mode as part of `AppState`.

- **Idle**: Request selected, no response yet (or previous response shown). `wrapMode` persists across requests.
- **Loading**: Request in flight. `wrapMode` is preserved.
- **Success**: Response received, displaying it. Rendering respects `wrapMode`.
- **Error**: Network/connection error. `wrapMode` is preserved.
- **File-load**: File-load overlay open. `wrapMode` is preserved.

#### Scenario: Wrap mode persists across request submissions
- **WHEN** a request is sent (entering Loading state) and a response is received (entering Success state)
- **THEN** the `wrapMode` SHALL be preserved unchanged

#### Scenario: Wrap mode persists across file reload
- **WHEN** a file reload or file load occurs
- **THEN** the `wrapMode` SHALL be preserved unchanged