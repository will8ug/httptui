## Context

httptui is an Ink-based (React for CLI) terminal UI with a fixed split-panel layout: a left Request List panel (~30% width, capped at 25–36 columns) and a right area containing an optional Request Details panel and a Response panel. A one-row status bar sits at the bottom. The layout is controlled by `Layout.tsx` which receives `left`, `right`, `bottom`, `overlay`, and `detailPanel` props. The app uses a reducer pattern (`AppState` → `Action` → reducer → new `AppState`) with all keyboard input handled in a single `useInput` hook in `app.tsx`.

There is currently no way to expand a panel beyond its column. When response bodies are wide or long, users must scroll horizontally — a poor experience for reading JSON or inspecting headers.

## Goals / Non-Goals

**Goals:**
- Allow any focused panel (requests, details, or response) to fill the full terminal area (minus the status bar).
- Provide a discoverable toggle key (`f`) that enters/exits fullscreen mode.
- Support `Escape` as an alternative way to exit fullscreen.
- Preserve all existing panel functionality (scrolling, search, verbose mode, etc.) within fullscreen.
- Keep fullscreen as a pure view toggle — state changes like toggling details (`d`) still work but are only visible when not in fullscreen.

**Non-Goals:**
- Resizeable split ratios (e.g., dragging a divider).
- Persistent fullscreen preference across sessions.
- Fullscreen for overlays (help, file load) — they already take the full area.

## Decisions

### D1: State field `maximizedPanel: FocusedPanel | null`

**Choice**: New field on `AppState`, not a new `AppMode` value.

**Rationale**: The existing `AppMode` (`'normal' | 'fileLoad' | 'search'`) controls input routing (all key events go to file-load or search handlers). Fullscreen is orthogonal — it changes layout rendering, not input semantics. Key presses like `v`, `/`, `R` still work in fullscreen. A separate boolean-like field keeps the concerns clean: `mode` for input routing, `maximizedPanel` for layout.

**Alternative considered**: `mode: 'fullscreen'`. Rejected because fullscreen is not an input mode — search, file-load, and help all work inside fullscreen. Adding it to `AppMode` would require every mode handler to also handle fullscreen, creating tangled conditionals.

### D2: Action type `TOGGLE_FULLSCREEN`

**Choice**: A single toggle action, not separate enter/exit actions.

**Rationale**: The reducer can determine direction from `state.maximizedPanel`: if `null`, set it to the current `focusedPanel`; if set, clear it to `null`. This follows the existing `TOGGLE_VERBOSE`, `TOGGLE_WRAP`, `TOGGLE_HELP`, `TOGGLE_REQUEST_DETAILS` pattern. No need for two actions when one suffices.

### D3: Key binding — `f` for fullscreen, `Escape` to exit

**Choice**: `f` toggles fullscreen on and off. `Escape` also exits fullscreen (but does not enter it).

**Rationale**: `f` is intuitive ("fullscreen"), unused, and consistent with vim/tmux conventions. `Escape` to exit matches the existing pattern of Escape dismissing overlays (help, search, file load). Users who enter fullscreen with `f` can exit with either `f` or `Escape`.

### D4: `Tab` is no-op in fullscreen

**Choice**: Pressing `Tab` in fullscreen mode does nothing. The user must exit fullscreen first.

**Rationale**: In fullscreen, only one panel is visible. Switching focus to a hidden panel would be confusing — the user would be "focused" on something they can't see. Exit fullscreen first, then Tab to switch.

### D5: `d` on details panel is no-op in fullscreen

**Choice**: When `maximizedPanel === 'details'`, pressing `d` does nothing. When maximized on other panels, `d` still toggles `showRequestDetails` in state (the visual effect appears upon exiting fullscreen).

**Rationale**: Collapsing the details panel while it's the only visible panel would leave the user staring at nothing. For other panels, `d` toggling state silently is fine — it's harmless and the user sees the effect when they exit fullscreen.

### D6: Layout rendering via `maximizedPanel` prop on `Layout`

**Choice**: Add a `maximizedPanel` prop to `Layout`. When set, render only the maximized panel at full width, plus the status bar.

**Rationale**: The existing `overlay` prop is for true overlays (help, file load) that block all input. Fullscreen is different — it's a panel view, not an overlay. A dedicated prop keeps the concerns separate and avoids fighting the overlay priority chain. Layout can branch cleanly: if `maximizedPanel` is set, render that panel + status bar; otherwise render the normal split.

### D7: Scroll offsets reset on toggle

**Choice**: When entering or exiting fullscreen, reset the horizontal scroll offset of the maximized panel to 0.

**Rationale**: Content widths change dramatically between split and fullscreen views. A horizontal offset that made sense in a 70-column panel is nonsensical in a full-width view. Resetting to 0 (like `TOGGLE_REQUEST_DETAILS` resets detail offsets) is safe and predictable.

### D8: Shortcut `f` — `showInBar: false`, `showInHelp: true`, group `display`

**Choice**: The fullscreen toggle appears only in the help overlay, not in the status bar.

**Rationale**: The status bar has a budget of 6 shortcuts and is already full. Fullscreen is an advanced feature that doesn't need constant visibility. The help overlay (`?`) provides discoverability.

## Risks / Trade-offs

**[Content width change on toggle]** → Horizontal offsets become invalid when panel width changes. **Mitigation**: Reset horizontal offsets to 0 when toggling fullscreen, consistent with the existing pattern in `TOGGLE_REQUEST_DETAILS`.

**[Confusion in fullscreen with hidden state changes]** → User toggles `d` while in fullscreen on requests — nothing visibly changes until they exit fullscreen. **Mitigation**: This is a minor concern. The state change is intentional (user pressed `d`), and the visual feedback appears on exiting fullscreen, which is discoverable.

**[Escape priority chain]** → Escape already has multiple behaviors (close help, cancel search, clear search results). Adding "exit fullscreen" inserts a new priority level. **Mitigation**: Insert "exit fullscreen" between search mode and normal-mode search clearing. Help overlay and search/file-load modes still take priority (their escape handlers fire first). In normal mode, escape exits fullscreen first, then clears search results on the next press.

**[Layout component complexity]** → Adding a new rendering branch to `Layout.tsx`. **Mitigation**: The branch is simple — three cases (maximized on requests, response, or details) each rendering one panel at full width. This is less complex than the overlay system.