## Context

httptui's data flow is one-directional: `cli.tsx` reads the file once, parses it with `parseHttpFile()`, and passes the immutable `requests` and `variables` arrays as props to `<App>`. The `AppState` stores them, and the reducer currently has no action to replace them. The `filePath` is already stored in state (from `props.filePath`).

The `useInput` hook in `app.tsx` broadcasts all keypresses. Lowercase `r` currently toggles raw mode. Capital `R` (Shift+R) is unassigned and is a natural fit for "reload" (follows vim convention where capital letters are stronger variants of lowercase counterparts).

## Goals / Non-Goals

**Goals:**
- Allow users to reload the .http file from disk without restarting httptui.
- Preserve selection when the same request still exists after reload.
- Clear response/error when reloading (stale responses are misleading).

**Non-Goals:**
- Auto-reload on file change (fs.watch). This adds complexity and edge cases (debouncing, deletion while editing). Manual reload is simpler and keeps the user in control.
- Editing .http files inside the TUI.
- Loading a different file (changing `filePath` at runtime).

## Decisions

### 1. Capital `R` as the reload shortcut

**Choice**: `R` (Shift+R) to reload the file.

**Why**: `r` is already taken for raw mode toggle. `R` follows vim's convention (capital = stronger action). It's mnemonic (Reload). Alternative candidates like `Ctrl+R` are harder to discover and conflict with terminal scrollback.

### 2. Selection preservation strategy

**Choice**: After reload, try to keep the same request selected by matching on request name. If the name no longer exists, reset to index 0. Clamp index if the new list is shorter.

**Why**: Users often tweak headers or body and reload — they want to immediately re-send the same request, not hunt for it again. Name matching (vs index) handles insertions and deletions correctly.

### 3. Clear response on reload

**Choice**: Set `response: null` and `error: null` on reload.

**Why**: A displayed response from a previous file version is misleading. The user should explicitly re-send to get fresh results.

### 4. Status confirmation via fleeting message

**Choice**: Add a `reloadMessage: string | null` field to `AppState`. On reload, set it to "Reloaded". A `setTimeout` dispatches a `CLEAR_RELOAD_MESSAGE` action after 2 seconds. `StatusBar` renders it when present.

**Why**: Users need confirmation that reload happened, especially if the file hasn't changed. A temporary message is visible but doesn't clutter the UI. Alternatives (flash, bell) are less accessible.

### 5. `RELOAD_FILE` action carries parsed data

**Choice**: The action payload includes `requests` and `variables` (the full `ParseResult`). The reducer replaces state fields and resets selection/scroll/response.

**Why**: File reading and parsing are side effects that don't belong in the reducer. The `useInput` handler reads the file, parses it, and dispatches the result. This keeps the reducer pure and testable.

## Risks / Trade-offs

- **File deleted while TUI is open** → `readFileSync` will throw. Catch this and show an error message instead of crashing. The user still sees the old data.
- **File become empty (all requests removed)** → `parseHttpFile` returns an empty array. Show an error state or just an empty request list. Same behavior as startup (which exits), but for reload we show the empty state since the user is still in the TUI.
- **Lowercase `r` ambiguity** → Mitigated by using `R`. No conflict with existing bindings.