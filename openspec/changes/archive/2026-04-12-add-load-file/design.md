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

### 2. Pop-up overlay for file input

**Choice**: When `o` is pressed, a centered pop-up overlay appears (similar to `HelpOverlay`) containing a prompt, a text input, and a hint line. The overlay blocks interaction with the main panels until the user confirms (Enter) or cancels (Escape).

**Why**: An overlay provides enough space to show the prompt, the typed path, a hint line, *and* inline error messages — all in one place. This is critical for error UX: when a file is not found or has no requests, the error appears inside the overlay next to the input, the typed path is preserved, and the user can immediately correct it and retry. A status bar replacement would have nowhere natural to show errors without losing the input text.

The overlay also makes the mode switch visually unambiguous — it's obvious you're in a different interaction state. This follows the existing `HelpOverlay` pattern already proven in the codebase, so the component structure is well-established.

The main trade-off is that the overlay obscures the current request list and response while it's open. This is acceptable because the user is *leaving* the current file — they don't need to reference it while typing a new path.

### 3. Mode state as a union field

**Choice**: Add `mode: 'normal' | 'fileLoad'` to `AppState`. In `fileLoad` mode, `useInput` routes keystrokes to the file path buffer instead of the normal handler.

**Why**: A discriminated union on `mode` makes the input routing unambiguous. The alternative — a separate `fileLoadActive` boolean — is more error-prone because other state fields (`fileLoadInput`, `fileLoadError`) only make sense in file-load mode, leading to nullable fields that must be guarded everywhere.

### 4. File path resolution

**Choice**: Resolve paths relative to `process.cwd()`, not relative to the currently loaded file.

**Why**: Users most commonly start httptui from the directory containing their `.http` files. Resolving against CWD matches the CLI startup behavior where `httptui path/to/api.http` resolves relative to CWD. Relative-to-current-file resolution would be surprising if the user has navigated to a different directory. Absolute paths always work regardless.

### 5. Error display inside overlay + success confirmation in status bar

**Choice**: Errors (file not found, no requests, parse failure) are displayed inline inside the overlay as red text below the input, preserving the typed path so the user can correct it. On successful load, the overlay closes and a fleeting `"Loaded: {basename}"` message appears in the status bar via the existing `reloadMessage` / `CLEAR_RELOAD_MESSAGE` mechanism.

**Why**: Showing errors inside the overlay is the key UX advantage of the overlay approach — the user sees the error right next to their input, can fix the path, and press Enter again without losing what they typed. This is much better than dispatching `REQUEST_ERROR` (which shows errors in the response panel, conflating file-load errors with HTTP errors). Success confirmation reuses the existing fleeting-message pattern for consistency with `R` reload.

### 6. State transitions on load

**Choice**: On successful load, the `LOAD_FILE` action replaces `requests`, `variables`, `filePath`, resets `selectedIndex` (with name-preserving logic), clears `response`, `error`, and resets scroll offsets. On error, only show the error — don't change the current file state.

**Why**: Same strategy as `RELOAD_FILE`, but also updates `filePath` so subsequent `R` reloads operate on the new file.

### 7. Input buffer management

**Choice**: Add `fileLoadInput: string` to `AppState`. When in `fileLoad` mode, printable keystrokes append to the buffer, Backspace deletes the last character, and Enter submits. The buffer starts empty when entering file-load mode.

**Why**: Keeping it in state enables rendering the input text in the component tree. Starting empty (rather than pre-filled with the current path) avoids accidental Enter pressing loading the same file — the user should type intentionally.

## Risks / Trade-offs

- **No tab-autocomplete**: Users must type the full path. This is acceptable for v1. Autocomplete can be added later with `fs.readdir` completions.
- **Mode confusion**: The overlay makes the mode switch visually obvious — it physically blocks the main UI. The hint line ("Press Enter to load, Esc to cancel") inside the overlay reinforces the available actions.
- **Empty file or parse failure**: If the new file has no requests, show an error and stay in the current state (don't switch to empty file).
- **Relative path ambiguity**: CWD-relative resolution is consistent with CLI behavior but may surprise users who expect path-relative-to-current-file. Documented in README.