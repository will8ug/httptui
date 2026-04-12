## Context

httptui has two similar but distinct file operations:
1. **Reload** (`R`): Re-reads the *same* file from `state.filePath`. Already implemented.
2. **Load** (`o`): Reads a *different* file specified by the user at runtime. This is the new feature.

The current TUI has a single interaction mode: all keypresses are handled by the `useInput` hook in `app.tsx`, which dispatches actions to a `useReducer`. Adding a text input for file paths introduces a *second mode* — a modal-like state where keystrokes go to text input instead of the normal key handler.

The app currently uses `readFileSync` for file I/O (in both `cli.tsx` and the `R` reload handler in `app.tsx`). The `parseHttpFile` function is already available and produces a `ParseResult` with `requests` and `variables`.

## Goals / Non-Goals

**Goals:**
- Allow users to open a different `.http` file without restarting httptui.
- Provide a clear text input UI for entering the file path.
- Handle errors gracefully (file not found, no requests in file, parse errors).
- Preserve selection by name when loading a new file (same as reload).
- Reuse existing file reading and parsing logic.

**Non-Goals:**
- File browser/autocomplete for paths (too complex for v1 scope).
- Remembering recently opened files.
- Opening multiple files simultaneously (tabs/splits).
- Watching for file changes automatically.

## Decisions

### 1. `o` key as the trigger

**Choice**: Press `o` (lowercase) to enter file-load mode.

**Why**: `o` is mnemonic ("open"), and it's currently unbound. It follows vim convention where `:e` opens a file, but since we don't have a command line, a single key is simpler. No conflict with existing bindings (`r` = raw, `R` = reload, `v` = verbose, `Tab`, `?`, `q`, `j`/`k`).

### 2. Text input as a mode (not a modal overlay)

**Choice**: When `o` is pressed, the app enters a "file-load mode". A text input bar appears at the bottom of the screen (replacing or overlaying the status bar area). All keystrokes go to the text input until Enter (confirm) or Escape (cancel).

**Why**: This mirrors how vim's command line works — the bottom of the screen becomes an input area. It's simpler than rendering a full modal overlay for what is essentially a single-line input. The existing help overlay pattern (boolean state toggle) shows we already have a modal mechanism, but a text input is different because it needs to capture keystrokes.

### 3. Mode state as a union field

**Choice**: Add `mode: 'normal' | 'fileLoad'` to `AppState`. In `fileLoad` mode, `useInput` routes keystrokes to the file path buffer instead of the normal handler.

**Why**: A discriminated union on `mode` makes the input routing unambiguous. The alternative — a separate `fileLoadActive` boolean — is more error-prone because other state fields (`fileLoadInput`, `fileLoadError`) only make sense in file-load mode, leading to nullable fields that must be guarded everywhere.

### 4. File path resolution

**Choice**: Resolve paths relative to `process.cwd()`, not relative to the currently loaded file.

**Why**: Users most commonly start httptui from the directory containing their `.http` files. Resolving against CWD matches the CLI startup behavior where `httptui path/to/api.http` resolves relative to CWD. Relative-to-current-file resolution would be surprising if the user has navigated to a different directory. Absolute paths always work regardless.

### 5. Confirm with a "Loaded" message (reuse the reloadMessage pattern)

**Choice**: On successful file load, set `reloadMessage` to `"Loaded: {basename}"`. The existing `CLEAR_RELOAD_MESSAGE` timeout (2 seconds) clears it.

**Why**: Reuses the existing fleeting-message mechanism — no new UI component. The basename of the new file distinguishes it from a plain "Reloaded" message. On error, dispatch `REQUEST_ERROR` which already handles error display.

### 6. State transitions on load

**Choice**: On successful load, the `LOAD_FILE` action replaces `requests`, `variables`, `filePath`, resets `selectedIndex` (with name-preserving logic), clears `response`, `error`, and resets scroll offsets. On error, only show the error — don't change the current file state.

**Why**: Same strategy as `RELOAD_FILE`, but also updates `filePath` so subsequent `R` reloads operate on the new file.

### 7. Input buffer management

**Choice**: Add `fileLoadInput: string` to `AppState`. When in `fileLoad` mode, printable keystrokes append to the buffer, Backspace deletes the last character, and Enter submits. The buffer starts empty when entering file-load mode.

**Why**: Keeping it in state enables rendering the input text in the component tree. Starting empty (rather than pre-filled with the current path) avoids accidental Enter pressing loading the same file — the user should type intentionally.

## Risks / Trade-offs

- **No tab-autocomplete**: Users must type the full path. This is acceptable for v1. Autocomplete can be added later with `fs.readdir` completions.
- **Mode confusion**: Entering file-load mode changes key behavior. The input bar with a prompt (e.g., `Open file: _`) and Escape to cancel should make the current mode obvious.
- **Empty file or parse failure**: If the new file has no requests, show an error and stay in the current state (don't switch to empty file).
- **Relative path ambiguity**: CWD-relative resolution is consistent with CLI behavior but may surprise users who expect path-relative-to-current-file. Documented in README.