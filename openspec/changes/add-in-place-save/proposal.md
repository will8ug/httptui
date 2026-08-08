## Why

httptui allows in-session body editing (`e`), but the only persistence path is `S` (save-as), which writes a **new** file and refuses to overwrite existing ones. Loading `api.http`, editing a body, and pressing `S` produces a default target path that already exists — the save is refused. There is currently **no way to write edits back to the source file**, leaving a gap between "edit in the TUI" and "keep the source file in sync."

## What Changes

- **New `Ctrl+S` in normal mode** triggers an in-place save: writes the current in-memory requests back to the source file (`state.filePath`), overwriting it. `S` remains save-as. This matches the standard editor pairing of "save" vs. "save as".
- **Surgical block replacement, not full re-serialization.** Only the request blocks whose bodies actually changed are rewritten from the serializer output. Comments, variables, layout, and non-edited requests in the source file remain byte-identical. This deliberately avoids the destructive full-file re-serialization that `serializeHttpFile` performs.
- **Diff-based edit detection.** Since the app only tracks a file-level unsaved-changes flag (not per-request), the source file is re-read and re-parsed at save time; requests whose body differs from the re-parsed original are the ones rewritten.
- **Source-format gating.** In-place save is available only when the loaded source is an http-format file (`.http`/`.rest`). For Postman/OpenAPI sources it is unavailable, with a transient message pointing at `S` — in-place writing of `.http` syntax into a `.json`/`.yaml` would corrupt it.
- **Separator handling.** The replacement always emits a `### <name>` separator line (canonical form, matching save-as output). A separator-less first request gains a `### Request N` line; comments above it survive because they lie outside the replaced region.
- **Line-ending preservation.** The replaced block uses the source file's line-ending convention (CRLF vs LF), so writes do not introduce mixed line endings.
- **Success semantics.** A successful in-place save clears the unsaved-changes flag and leaves `state.filePath` unchanged (no rebind, unlike save-as).
- **Guard.** In-place save refuses (transient message) if an edited body contains a line starting with `###`, which would split the request on reload.

## Capabilities

### New Capabilities

- `in-place-save`: writing edited requests back to the source `.http`/`.rest` file via `Ctrl+S` in normal mode, with surgical block replacement, source-format gating, and line-ending preservation.

### Modified Capabilities

- `save-as-http`: the file-name conflict refusal (refuse when the target exists) gains an explicit exception — in-place save *is* an overwrite of the source file, by design.
- `unsaved-changes`: successful in-place save clears the unsaved-changes flag; the current file path is unchanged (unlike save-as, which rebinds it).
- `request-editing`: `Ctrl+S` is now context-dependent — inside the body editor it commits the edit to memory; in normal mode it persists the source file. The commit-only behavior inside the editor is unchanged.
- `shortcuts`: the registry gains a normal-mode `Ctrl+S` entry ("Save to source file") in the Request group, in addition to the existing edit-group `Ctrl+S` entry.

## Impact

- **`src/core/http-serializer.ts`** — export `serializeRequestBlock` (currently internal) for single-block serialization.
- **`src/core/types.ts`** — new action variant(s) for the in-place save path.
- **`src/core/reducer.ts`** — handling for the new action; reuse/extend the `SAVE_FILE` case (clears `isDirty`) without the path rebind.
- **`src/app.tsx`** — `Ctrl+S` branch in the normal-mode key handler; the re-read / diff / splice / write side-effect (following the existing `saveLoad` side-effect pattern).
- **`src/core/shortcuts.ts`** — new registry entry (`Ctrl+S`, group `request`, help-only).
- **Tests** — unit tests for the block-replacement/splice logic (pure function) and serializer export; integration tests for the keybinding flow and unsaved-changes clearing.
- **`docs/saving.md`** — document in-place save alongside save-as.
