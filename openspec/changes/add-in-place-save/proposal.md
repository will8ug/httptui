## Why

httptui allows in-session body editing (`e`), but the only persistence path is `S` (save-as), which writes a **new** file and refuses to overwrite existing ones. Loading `api.http`, editing a body, and pressing `S` produces a default target path that already exists — the save is refused. There is currently **no way to write edits back to the source file**, leaving a gap between "edit in the TUI" and "keep the source file in sync."

## What Changes

- **New `Ctrl+S` in normal mode** triggers an in-place save: writes the current in-memory requests back to the source file (`state.filePath`), overwriting it. `S` remains save-as. This matches the standard editor pairing of "save" vs. "save as".
- **Confirmation before overwrite.** Because in-place save rewrites the user's source file (and, unlike save-as, has no conflict refusal), `Ctrl+S` displays a confirmation pop-up — naming the file and the number of changed requests — and writes only after the user confirms with `y` (`n`/`Escape` cancels without writing).
- **Surgical block replacement, not full re-serialization.** Only the request blocks whose bodies actually changed are rewritten from the serializer output. Comments, variables, layout, and non-edited requests in the source file remain byte-identical. This deliberately avoids the destructive full-file re-serialization that `serializeHttpFile` performs.
- **Per-request edit selection.** The per-request `isDirty` marker (from the **per-request-unsaved-changes** change) identifies which requests were edited in-session; only marked requests' blocks are rewritten. The source file is still re-read and re-parsed at save time, but only to locate each marked request's block in the current on-disk content (stored line numbers go stale after a prior save) — not to detect edits. A structural guard refuses when the re-parsed request count differs from the in-memory state.
- **Source-format gating.** In-place save is available only when the loaded source is an http-format file (`.http`/`.rest`). For Postman/OpenAPI sources it is unavailable, with a transient message pointing at `S` — in-place writing of `.http` syntax into a `.json`/`.yaml` would corrupt it.
- **Separator handling.** The replacement always emits a `### <name>` separator line (canonical form, matching save-as output). A separator-less first request gains a `### Request N` line; comments above it survive because they lie outside the replaced region.
- **Line-ending preservation.** The replaced block uses the source file's line-ending convention (CRLF vs LF), so writes do not introduce mixed line endings.
- **Success semantics.** A successful in-place save clears every request's `isDirty` marker (the file-level `*` indicator is derived from them) via the reused `SAVE_FILE` action, and leaves `state.filePath` unchanged (no rebind, unlike save-as).
- **No-change feedback.** If `Ctrl+S` is pressed with no marked requests, the status bar shows a transient `No changes to save` message instead of silently doing nothing (and no confirmation prompt appears).
- **Guard.** In-place save refuses (transient message) if an edited body contains a line starting with `###`, which would split the request on reload.

## Capabilities

### New Capabilities

- `in-place-save`: writing edited requests back to the source `.http`/`.rest` file via `Ctrl+S` in normal mode, with surgical block replacement, source-format gating, and line-ending preservation.

### Modified Capabilities

- `save-as-http`: the file-name conflict refusal (refuse when the target exists) gains an explicit exception — in-place save *is* an overwrite of the source file, by design.
- `unsaved-changes`: successful in-place save clears the per-request unsaved-changes markers (the file-level flag is derived from them); the current file path is unchanged (unlike save-as, which rebinds it).
- `request-editing`: `Ctrl+S` is now context-dependent — inside the body editor it commits the edit to memory; in normal mode it persists the source file. The commit-only behavior inside the editor is unchanged.
- `shortcuts`: the registry gains a normal-mode `Ctrl+S` entry ("Save to source file") in the Request group, in addition to the existing edit-group `Ctrl+S` entry.

## Impact

- **`src/core/http-serializer.ts`** — export `serializeRequestBlock` (currently internal) for single-block serialization.
- **`src/core/in-place-save.ts`** — new pure builder module: marker-based edited set, geometry re-parse, structural guard, splice.
- **`src/core/types.ts`** — new `'confirmInPlaceSave'` mode value and the confirmation actions.
- **`src/components/ConfirmInPlaceSaveOverlay.tsx`** — new near-clone of `ConfirmDiscardOverlay` for the overwrite confirmation.
- **`src/core/reducer.ts`** — ENTER/CONFIRM/CANCEL cases for the confirmation mode; the existing `SAVE_FILE` case is reused as-is for the post-write state (it already clears every request's `isDirty` marker).
- **`src/app.tsx`** — `Ctrl+S` branch (gate → format check → enter confirmation); the confirm-mode `y`/`n`/`Escape` handling that re-reads, builds, writes, and dispatches `SAVE_FILE`.
- **`src/core/shortcuts.ts`** — new registry entry (`Ctrl+S`, group `request`, help-only).
- **Tests** — unit tests for the block-replacement/splice logic (pure function), serializer export, and the confirmation overlay; integration tests for the keybinding, confirmation, and marker-clearing flows.
- **`docs/saving.md`** — document in-place save alongside save-as.
