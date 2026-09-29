# httptui

A terminal HTTP client built on Ink: it parses `.http` files, Postman collections, and OpenAPI documents into a selectable request list, sends the resolved request with undici, and displays the response in a split-panel TUI. This file is the domain map and shared vocabulary; workflow conventions live in [AGENTS.md](./AGENTS.md), and behavior contracts are pinned by the test suite.

## Capability Map

The TUI occupies the alternate screen buffer with a split layout: a request list on the left (30% of terminal width, minimum 25 characters), a response panel filling the remaining width, and a status bar across the bottom row. A toggleable request-details panel shows the resolved request, and any panel can expand to fullscreen (`f`). Overlays cover the layout when active: help (`?`), the in-TUI request editor (`e`), save-as (`S`), save-response (`s`), file load (`o`), the environment picker (`E`), and confirmation prompts for discarding unsaved changes or overwriting a source file. Application states: idle, loading, success, error.

- **CLI & configuration**: `httptui <file>` entry, `--help`/`--version`, the global config (`~/.config/httptui/config.json`, overridable via `$HTTP_TUI_CONFIG`/`$XDG_CONFIG_HOME`) shallow-merged with a project sidecar `.httptui.json` (project wins), and the supported Node.js runtime floor. `src/cli.tsx`, `src/args.ts`, `src/core/config.ts`, `src/version.ts`.
- **Environments & variables**: `{{...}}` placeholder resolution in two passes (file variables first, then system/env variables), environment files layered over the file-variable base via `--env`/`--env-name` flags, config registration, and the runtime picker. `src/core/variables.ts`, `src/core/env-parser.ts`, `src/core/env-aggregator.ts`.
- **File I/O & the .http format**: the zero-dependency `.http`/`.rest` parser (`###` separators, `@name = value` variables), in-TUI file load (`o`) and reload (`R`), the three save flavors, and the dirty-marker tracking plus discard confirmation that guard them. `src/core/parser.ts`, `src/core/format-detector.ts`, `src/core/in-place-save.ts`, `src/core/http-serializer.ts`, `src/core/response-save.ts`.
- **HTTP execution**: undici execution of the resolved request (no redirects, no deadlines, no retries; non-2xx is a valid response), user-driven cancellation of in-flight requests, and host-matched client certificates for mTLS. `src/core/executor.ts`, `src/core/certificates.ts`.
- **Request editing**: the in-TUI raw-text editor with URL/headers/body tabs, multipart form-data bodies (encoded but not editable in-TUI), and handoff to the user's external editor for whole-file edits. `src/core/editor.ts`, `src/core/editor-launcher.ts`, `src/components/EditOverlay.tsx`.
- **Navigation & display**: panel focus cycling (`Tab`), horizontal scroll and edge jumps (`g`/`G`/`0`/`$`), display-cell text measurement, wrap vs truncate (`w`), fullscreen, and response rendering with states, pretty-print/raw toggle (`r`), and verbose headers (`v`). `src/utils/scroll.ts`, `src/utils/wrap.ts`, `src/utils/layout-metrics.ts`, `src/core/response-layout.ts`, `src/components/ResponseView.tsx`.
- **Response search**: `/` search over the formatted body, `n`/`N` match navigation, visual-line-aware match indicators, and the inline search bar. `src/components/ResponseView.tsx`, `src/core/reducers/`.
- **Import & export**: OpenAPI 3.x and Postman v2.1 importers (synthetic line numbers, logged warnings for unsupported features) and the paste-as-curl (`p`) / copy-as-curl (`y`) clipboard round-trip. `src/core/openapi-parser.ts`, `src/core/postman-parser.ts`, `src/core/curl-parser.ts`, `src/core/curl-serializer.ts`, `src/core/clipboard.ts`.
- **Panels, status & shortcuts**: the request list (resolved `METHOD /path` entries), the request-details panel (`d`), the context-aware status bar (position indicators, transient messages, unsaved-changes `*`, environment name, INSECURE flag), and the centralized `SHORTCUTS` registry feeding both the status bar and the two-column help overlay. `src/components/RequestList.tsx`, `src/components/RequestDetailsView.tsx`, `src/components/StatusBar.tsx`, `src/components/HelpOverlay.tsx`, `src/core/shortcuts.ts`.

## Language

### Requests & variables

**Raw request**:
The request as parsed from the file or typed in the editor: URL, headers, and body with `{{...}}` placeholders left verbatim. The file and the editor operate on raw text only.
_Avoid_: unresolved request, template request

**Resolved request**:
The raw request after variable substitution: what the executor sends, the details panel displays, the request list's path entries show, and copy-as-curl serializes.
_Avoid_: interpolated request, expanded request

**File variables**:
Declarations of the form `@name = value` at file scope, referenced as `{{name}}`. The base variable layer, scoped to a single file.
_Avoid_: local variables, constants

**System variables**:
Built-in placeholders `{{$timestamp}}`, `{{$guid}}`, and `{{$randomInt min max}}`, evaluated fresh at each resolution rather than at parse time.

**Environment**:
A named variable set loaded from a Postman `.postman_environment.json` or simplified-format file, activated via `--env`/`--env-name` or the runtime picker. Its variables override same-named file and collection variables.
_Avoid_: profile, workspace

**Variable precedence**:
The resolution layering rule: the active environment's variables override file (and collection) variables; file variables are resolved first and may reference system variables, which resolve in a second pass.

**Pristine file-variable base**:
The loaded file's own variable declarations held in state without any environment merge; the active environment is merged over it on demand, and switching to `(none)` falls back to it.

### Files & saving

**http-format source**:
A `.http`/`.rest` file backing the session, as opposed to content loaded from Postman, OpenAPI, or curl imports. In-place save and external-editor handoff require one.

**Dirty marker**:
The per-request flag set by any committed edit that changes the stored value; only loading, reloading, or saving clears it. The file-level flag (any marker set) renders as `*` before the file name in the status bar.
_Avoid_: modified flag

**In-place save**:
`Ctrl+S`: rewrite only the dirty request blocks inside the source file, preserving its line-ending convention and all other on-disk content.

**Save-as**:
`S`: serialize all requests plus file variables to a new `.http` path; the session rebinds to the written file. Form-data bodies are omitted with an inline comment.
_Avoid_: export

**Save response**:
`s`: write the displayed response's raw body to disk exactly as received, without rebinding the current file.

**Editor handoff**:
`Ctrl+G`: release the terminal to the user's external editor to edit the whole source file, then reload it if the file changed on disk.

### Panels & display

**Alternate screen buffer**:
The fullscreen terminal mode the TUI draws in; the previous terminal contents are restored on exit.

**Focused panel**:
Which of `requests`, `response`, or `details` receives navigation keys; `Tab` cycles focus, and the status bar's right segment reports context for the focused panel.

**Fullscreen mode**:
The state where one panel occupies the entire terminal minus the status bar while the others are hidden; `f` toggles it and `Escape` exits it.
_Avoid_: maximized view, zoom

**Wrap mode**:
The response panel's line-display toggle: `nowrap` truncates long lines and permits horizontal scrolling; `wrap` breaks lines at the panel's content width and disables horizontal scroll.

**Visual line**:
One rendered row of a panel; in wrap mode a single raw line may occupy several visual lines. Scroll offsets, match indicators, and status-bar totals count visual lines.
_Avoid_: screen line

**Display width**:
Text length measured in terminal display cells rather than code units; slicing boundaries never split wide characters or grapheme clusters.
_Avoid_: character count, string length

**Request details panel**:
The toggleable panel (`d`) showing the resolved request (method, URL, headers, body); the display counterpart to the raw-text editor.

**Search state**:
The response-search quartet: current query, matched line numbers, current match index, and last confirmed query. Computed against the formatted body, cleared on response changes, dismissible with `Escape` or `q`.

**Transient message**:
A status-bar success, error, or warning notice; the three channels are mutually exclusive and auto-clear roughly 2 seconds after the displayed text last changed.

### Execution & response

**Insecure mode**:
TLS certificate verification disabled via `--insecure`; the status bar shows an INSECURE indicator while it is active.
_Avoid_: skip-verify mode

**Raw body**:
The response body decoded exactly as received, before line-ending normalization; save-response writes it. The display-facing body field normalizes CRLF and lone CR to LF.
_Avoid_: original body
