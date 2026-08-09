## Why

The body editor shipped with the extension seam fixed deliberately: `EditTarget` was designed to widen, and the body-editing change explicitly deferred "URL editing, header editing, and the tab strip that would select between targets." The URL is the field users tweak most after the body — pointing at a different host, adjusting a path or query parameter — and today that means leaving the TUI, editing the source file, and pressing `R`, which throws away the response being compared against. This change delivers the planned second edit target and the tab strip that selects between targets.

## What Changes

- **`e` opens a tabbed request editor** instead of the body-only editor. The overlay gains a tab strip with `url` and `body` tabs; the `url` tab is active on open. The future `headers` tab is not rendered yet.
- **`Shift+Tab` switches the active tab.** Each tab keeps its own buffer and cursor for the duration of the editing session, so switching never loses in-progress edits. The key is detected as `key.tab && key.shift` (backtab), which Ink parses reliably across xterm-class terminals.
- **The URL tab is single-line.** `Enter` is a no-op there, and newline characters inside pasted input are stripped before insertion. The body tab keeps the existing multi-line behavior unchanged.
- **`Ctrl+S` commits every changed target at once.** The URL buffer replaces `request.url` verbatim; the body buffer replaces `request.body` (an empty body buffer still normalizes to `undefined`). The request's dirty marker is set only when at least one committed value differs — a no-op commit stays clean. The confirmation message becomes `Request updated` for any committed change.
- **`Escape` cancels the whole session**, discarding both tabs' buffers with no confirmation, consistent with today.
- **The raw-versus-resolved contract extends to the URL**: the editor displays the raw URL with `{{variable}}` placeholders verbatim, exactly as the body tab does for bodies.
- **The form-data restriction shrinks from entry to the body tab.** `e` on a form-data request now opens the editor so the URL can be edited; switching to the body tab is refused with the existing explanatory message.
- **Persistence needs no new code.** Committed URL edits flow into the request-details panel, send, `S` export, and in-place save, because all of them operate on the in-memory request — in-place save re-serializes the dirty request's whole block, request line included.

Not in this change: the headers tab, method editing, commit-time URL validation (malformed URLs continue to surface as send-time errors), undo/redo, and the `$EDITOR` handoff.

## Capabilities

### New Capabilities

None. The tabbed editor extends the existing `request-editing` capability rather than introducing a parallel one.

### Modified Capabilities

- `request-editing`: `e` opens a two-tab editor (URL tab active) instead of the body-only editor; the raw-versus-resolved contract, commit, cancel, and form-data requirements are amended for multiple targets; new requirements cover the tab strip, `Shift+Tab` switching, single-line URL editing, and multi-target commit semantics.
- `shortcuts`: the `e` registry entry's description is updated for the tabbed editor, and a `Shift+Tab` entry joins the `edit` group (help-only; the six-item status-bar budget is unchanged).

## Impact

**Modified source files**

- `src/core/types.ts` — `EditTarget` widens to `'body' | 'url'`; `AppState` replaces `editBuffer`/`editCursor` with per-target edit buffers; `ENTER_EDIT` carries both seed buffers; `Action` gains `SWITCH_EDIT_TAB`.
- `src/core/reducer.ts` — `ENTER_EDIT` seeds both tabs; `EDIT_KEY` applies to the active tab and strips newlines for the URL target; new `SWITCH_EDIT_TAB` case; `COMMIT_EDIT` commits both targets with per-field change detection; `createInitialState` seeds the new shape.
- `src/app.tsx` — the `e` handler seeds both buffers and opens on the URL tab (the form-data guard leaves entry); the edit-mode branch dispatches tab switching on `key.tab && key.shift`; the overlay receives tab-strip props.
- `src/components/EditOverlay.tsx` — renders the tab strip and an updated hint line; the title becomes target-agnostic.
- `src/core/shortcuts.ts` — the `e` entry description and the new `Shift+Tab` entry.
- `README.md` — the Request/Edit shortcut tables and the in-session editing feature bullet.

**No new source files and no new dependencies.** The pure buffer machinery in `src/core/editor.ts` is reused unchanged.

**Architectural invariants preserved**

- Exactly one `useInput`, in `src/app.tsx`; components remain display-only with no local state.
- All behavior lives in the pure reducer; per-tab buffers are plain data.
- Send, request-details display, save-as, and in-place save are untouched — they already consume the in-memory request.
