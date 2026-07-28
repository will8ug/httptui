## Why

httptui can browse, resolve, send, and export requests, but every request is read-only from the moment it is parsed. Tweaking a JSON payload to retry a call means leaving the TUI, editing the source file, and pressing `R` — which throws away the response you were comparing against. An in-app editor closes that loop.

Request body is the natural first target: URL and header editing reduce to a single-line input and a key/value list, both of which the codebase already does, while the body is the only field that needs genuinely new multi-line editing machinery. Building the hard one first de-risks the rest.

## What Changes

- **New `e` shortcut** opens a centered overlay for editing the selected request's body. The overlay shows the **raw** body text with `{{variable}}` placeholders intact — not the resolved text shown by the request-details panel.
- **New multi-line editing behavior** inside the overlay: printable characters, `Enter` (inserts a newline), `Backspace`, `Delete`, `←`/`→`/`↑`/`↓` cursor movement, `Home`/`End` (and `Ctrl+A`/`Ctrl+E`) for line edges, with the viewport scrolling vertically and horizontally to follow the cursor. `Ctrl+S` commits, `Escape` cancels and discards the edit.
- **Edits are in-session only.** A committed edit updates the in-memory request, so it is immediately reflected in the request-details panel and used when the request is sent. Nothing is written to the source file. The existing `S` (save as `.http`) command exports the edited requests, because it already serializes from in-memory state.
- **Form-data requests are blocked** from body editing with an explanatory transient message, because form-data bodies are not representable in the `.http` format.
- **New unsaved-changes tracking.** A `*` marker appears in the status bar once any edit is committed, and clears on any successful save. `R` (reload), `o` (open file), and `q` (quit) prompt for confirmation before discarding unsaved edits; `Ctrl+C` still exits immediately.
- **Extension seam is fixed now, not later.** The mode is `mode: 'edit'` carrying an `editTarget`, so adding URL and header targets later widens a type rather than reshaping the state machine. Only `'body'` exists in this change, so no unreachable code is introduced.

Not in this change: writing edits back to the source file in place, URL editing, header editing, undo/redo, and the `$EDITOR` handoff. Each is additive on top of this foundation.

## Capabilities

### New Capabilities
- `request-editing`: Entering and leaving edit mode, the body editor's observable text-manipulation and cursor behavior, the raw-versus-resolved contract, commit and cancel semantics, and the form-data restriction.
- `unsaved-changes`: The unsaved-changes marker, when it is set and cleared, and the confirmation prompt that guards actions which would discard uncommitted-to-disk edits.

### Modified Capabilities
- `shortcuts`: The centralized `SHORTCUTS` registry gains an `e` entry in the `request` group, help-only, preserving the existing six-item status-bar budget.

## Impact

**New source files**
- `src/core/editor.ts` — pure, dependency-free text-buffer functions (cursor movement, insertion, deletion, offset/line-column conversion).
- `src/components/EditOverlay.tsx` — display-only overlay rendering the buffer, the cursor, and the key hints.
- `src/components/ConfirmDiscardOverlay.tsx` — display-only confirmation prompt.

**Modified source files**
- `src/core/types.ts` — `AppMode` gains `'edit'` and `'confirmDiscard'`; new `EditTarget` and `PendingDiscardAction` types; `AppState` gains edit-buffer, dirty, and pending-action fields; `Action` gains the edit and confirm actions.
- `src/core/reducer.ts` — new cases for the edit and confirm actions; `RELOAD_FILE`, `LOAD_FILE`, and `SAVE_FILE` clear the dirty flag; `createInitialState` seeds the new fields.
- `src/app.tsx` — a new `state.mode === 'edit'` branch and a `state.mode === 'confirmDiscard'` branch in the single `useInput` handler; the `e` key in normal mode; dirty guards on `R`, `o`, and `q`; the new overlays wired into `Layout`'s `overlay` prop.
- `src/components/StatusBar.tsx` — renders the `*` marker.
- `src/core/shortcuts.ts` — the `e` registry entry.
- `README.md` — the Request shortcuts table.

**Architectural invariants preserved**
- Exactly one `useInput`, in `src/app.tsx`. Components stay display-only with no local state.
- All behavior lives in the pure reducer and the pure `core/editor.ts` module, keeping it unit-testable against the project's published coverage badges.
- No new runtime dependencies.
