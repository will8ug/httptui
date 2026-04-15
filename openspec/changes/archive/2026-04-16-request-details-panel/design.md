## Context

httptui is a terminal UI for `.http`/`.rest` files built with Ink (React for CLIs). The app uses a two-column `Layout` component: left panel for request list, right panel for response view, bottom bar for status. Overlays (Help, FileLoad) take over the entire screen. State is managed via a single `useReducer` in `app.tsx` with an `Action` discriminated union. The selected request is stored as an index (`selectedIndex`), and the full `ParsedRequest` array is in state. Variable resolution happens on-the-fly via `resolveVariables()` when sending — resolved data is never stored in state.

Currently, users can only see the parsed (raw) request name in the left panel. There's no way to inspect what the resolved request (with variables substituted) looks like before or after sending.

## Goals / Non-Goals

**Goals:**
- Provide a toggleable panel that shows the fully resolved request details (method, URL, headers, body) for the currently selected request
- Toggle visibility with a single keystroke (`d`), consistent with existing toggle patterns (`v` for verbose, `?` for help)
- Integrate seamlessly into the existing two-column layout without disrupting the response view when hidden

**Non-Goals:**
- Editing requests from within the details panel (read-only view only)
- Persisting the panel visibility across app restarts
- Independent scrolling within the details panel (it's a quick-glance view)
- Showing raw (unresolved) request data — the panel always shows resolved values

## Decisions

### 1. Panel placement: Inside right column, above ResponseView

**Decision**: When visible, the right panel column becomes a vertical flex container with `RequestDetailsView` on top and `ResponseView` below.

**Rationale**: This follows the existing Layout pattern. The right panel is already a flex child. Splitting it into two vertical sections retains the left-right split while adding the details view above the response.

**Alternatives considered**:
- *Full-screen overlay* (like HelpOverlay): Rejected — hides the response view entirely, defeating the purpose of a "quick glance" panel.
- *Below the response*: Rejected — response is the primary content; details should be above for visibility.
- *Replacing the response*: Rejected — users need to see both simultaneously in many workflows.

### 2. Variable resolution: Show resolved data in the panel

**Decision**: The `RequestDetailsView` component receives the `ParsedRequest` and `FileVariable[]`, calls `resolveVariables()` internally, and displays the resolved result.

**Rationale**: Users want to see what will actually be sent — the URL with variables substituted, headers with real values. This matches the mental model of "what am I about to send?"

**Alternatives considered**:
- *Show raw template strings*: Less useful — users can see that in the `.http` file.
- *Store resolved request in state*: Rejected — would add state complexity for a derived value that's cheap to compute on render.

### 3. Shortcut key: `d` for "details"

**Decision**: Use `d` as the toggle key, added to `shortcuts.ts` with `showInBar: false`, `showInHelp: true`.

**Rationale**: `d` is mnemonic for "details", doesn't conflict with existing shortcuts (`h/j/k/l` for nav, `v` for verbose, `w` for wrap, `o` for open, `R` for reload, `?` for help, `q` for quit). Hidden from the compact status bar but visible in the help overlay, consistent with how `w` and `o` are handled.

### 4. Panel height: Content-driven with a maximum of ~10 rows

**Decision**: The panel height adapts to its content (method+URL line, header lines, body preview) but caps at approximately 10 visible rows. If the content exceeds this, the body is truncated with an ellipsis indicator.

**Rationale**: The details panel should show useful information without consuming too much vertical space from the response view. Most requests have a short method+URL line and a few headers, fitting in 4-6 rows. A 10-row cap ensures the response view always retains at least 14+ rows in a standard 24-row terminal.

### 5. State management: Boolean toggle in AppState + new Action

**Decision**: Add `showRequestDetails: boolean` to `AppState` (default `false`). Add `{ type: 'TOGGLE_REQUEST_DETAILS' }` to `Action` discriminated union. Handle `d` key in `useInput` to dispatch the action.

**Rationale**: Follows the exact pattern used by `showHelp` / `TOGGLE_HELP` and `verbose` / `TOGGLE_VERBOSE`. Minimizes cognitive overhead and maintains the existing reducer architecture.

## Risks / Trade-offs

- **[Vertical space]** → Adding the panel reduces response view height. Mitigated by making the panel toggleable (default hidden) and capping its height at ~10 rows.
- **[Variable resolution on every render]** → Calling `resolveVariables()` on every render when the panel is visible. Mitigated by: (1) `resolveVariables` is lightweight (string substitution), (2) the panel is only visible on-demand, (3) React re-renders are cheap in Ink. If performance becomes an issue, `useMemo` can be added later.
- **[Dynamic variable values]** → System variables like `{{$timestamp}}` and `{{$guid}}` produce different values each time they're resolved. The panel will show values resolved at render time, which may differ from what's sent if there's a delay. This is acceptable — the panel shows "what would be sent now."