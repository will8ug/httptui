## Context

The save-as (`S`) and file-load (`o`) overlays are pure presentational components (`SaveOverlay.tsx`, `FileLoadOverlay.tsx`) that render a `value` string with a hardcoded trailing `_` cursor. All input handling lives in `app.tsx`'s `useInput`, in the `saveLoad` and `fileLoad` branches, which append `input` to the state string and implement backspace as `slice(0, -1)` — there is no cursor position anywhere. `src/core/editor.ts` already provides a pure `EditorBuffer = { text, cursor }` model with `insertText`, `deleteBackward`, `moveLeft`, `moveRight` (plus multi-line ops we don't need), and `EditOverlay.tsx` demonstrates inline cursor inversion. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Give the save and file-load path inputs a movable cursor using the existing single-line editor primitives.
- Preserve the compact overlay look; only the cursor cell changes.
- Keep the "error clears on input modification" contract, where cursor movement is not a modification.

**Non-Goals:**
- No `Home`/`End` (`Ctrl+A`/`Ctrl+E`) or forward `Delete` for path inputs — only `←`/`→` plus cursor-aware insert/backspace (required for coherence).
- No newline stripping; path inputs remain single-line in practice and current raw-append behavior is preserved.
- Search mode input is untouched.
- File-load error behavior is unchanged (its error persists until cancel/reload today, unlike save; not in scope).

## Decisions

### 1. Reuse `editor.ts` granular helpers, not `EditOverlay` or `applyEditOp`

`editor.ts` is a pure-logic module with no React. We import `insertText`, `deleteBackward`, `moveLeft`, `moveRight` directly into the `app.tsx` handlers and operate on a locally-built `{ text, cursor }` buffer.

- **Chosen**: compute in `app.tsx` (mirroring the existing save/fileLoad pattern where the handler already computes `slice`/append), then dispatch the result.
- **Alternative A** — reuse `applyEditOp` via a new `EDIT_KEY`-style action in the reducer. Rejected: `EditOp` carries multi-line ops (`up`/`down`/`lineStart`/`lineEnd`) and `EDIT_KEY` also threads scroll-clamping (`visibleHeight`/`visibleWidth`) that single-line inputs don't need.
- **Alternative B** — extract a shared single-line input component/reducer. Rejected as over-engineering for two inputs; `SaveOverlay`/`FileLoadOverlay` stay as-is except for the cursor cell.

### 2. State shape: two cursor fields (option a)

Add `saveCursor: number` and `fileLoadCursor: number` to `AppState`, alongside the existing `saveInput`/`fileLoadInput` strings.

- **Chosen**: minimal diff; existing tests keep asserting `saveInput`/`fileLoadInput` directly.
- **Alternative** — refactor to `EditorBuffer` (`{ text, cursor }`) per input, matching `editBuffers`. Rejected: larger blast radius on the state shape and tests for no behavioral benefit here.

Invariant: `0 <= cursor <= text.length`. All mutations go through `editor.ts` helpers (which clamp) and each input action sets `value` and `cursor` atomically.

### 3. Separate text-edit and cursor-move actions per field

- `UPDATE_SAVE_INPUT { value, cursor }` and `UPDATE_FILE_LOAD_INPUT { value, cursor }` — text edits (insert/backspace), extended from the existing value-only actions.
- New `MOVE_SAVE_CURSOR { cursor }` and `MOVE_FILE_LOAD_CURSOR { cursor }` — cursor-only movement.

**Rationale**: `UPDATE_SAVE_INPUT` clears `saveError` (the existing "error clears on input change" contract), but `MOVE_SAVE_CURSOR` must not. Keeping them as distinct actions makes that contract explicit rather than inferred. The file-load side is symmetric even though its `UPDATE_FILE_LOAD_INPUT` never cleared errors.

**Alternative** — one action per field where the reducer clears the error only when `value` changed. Rejected: implicit and harder to reason about.

### 4. Cursor rendering via inline inversion

`SaveOverlay`/`FileLoadOverlay` gain a `cursor: number` prop. The value line renders three slices — `value.slice(0, cursor)`, an inverted `<Text inverse>{value[cursor] ?? ' '}</Text>`, and `value.slice(cursor + 1)` — exactly `EditOverlay`'s technique. The `_` literal is removed; at end-of-input the cursor is an inverted trailing space. No scroll/horizontal-offset logic is needed (paths are short single lines).

### 5. Cursor initialization and reset

- `ENTER_SAVE` seeds `saveCursor = defaultPath.length` (cursor at end of the pre-filled default).
- `ENTER_FILE_LOAD` seeds `fileLoadCursor = 0` (empty input).
- `SAVE_FILE`, `CANCEL_SAVE`, `LOAD_FILE`, `CANCEL_FILE_LOAD` reset the corresponding cursor to `0`.

## Risks / Trade-offs

- [Cursor/text desync if a future action sets a string without its cursor] → Mitigation: input actions always carry `value` and `cursor` together; `editor.ts` helpers clamp the cursor.
- [Integration tests assume backspace removes the last character] → The cursor starts at the end of the default path, where cursor-aware backspace is identical to the old `slice(0, -1)`; `save-as-http.test.tsx` should pass unchanged.
- [Removing the always-visible `_`] → The inverted cell (or trailing space) is the cursor indicator, consistent with the editor overlay; accepted.
