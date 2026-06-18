## Why

httptui can import Postman collections (`.json`) but has no path back to the text-based `.http` format. Users who open a Postman collection cannot migrate it into a version-controllable, editor-friendly `.http` file without leaving the tool. Adding a "save as `.http`" command closes the loop: import a Postman collection, run requests, then export the whole set to a `.http` file for editing, diffing, and sharing.

## What Changes

- Add a pure `.http` serializer that converts the in-memory `ParseResult` (`ParsedRequest[]` + `FileVariable[]`) into `.http` file text matching the format the existing parser reads.
- Add a `S` keyboard shortcut (help-overlay only, not in status bar) that opens a save-path overlay from normal mode.
- The save overlay defaults the path to `<collection-basename>.http` in the same directory as the loaded file, and accepts an absolute path or a path relative to that directory.
- On file-name conflict (target file already exists), automatically append a ` - N` suffix to the basename (no confirmation dialog), incrementing `N` until a free name is found.
- Write the serialized `.http` content to disk and surface a transient status message ("Saved N requests to <path>").
- Form-data request bodies (which have no representation in the `.http` format) are omitted with an inline `#` comment noting the omission, consistent with the existing warn-and-skip philosophy.
- Add the `S` shortcut to the centralized `SHORTCUTS` registry with `showInBar: false` and `showInHelp: true`.

## Capabilities

### New Capabilities
- `save-as-http`: Serialize the currently loaded requests and file variables to a `.http` file via a save-path overlay triggered by the `S` key, with default-path derivation, conflict-suffix auto-increment, and form-data omission handling.

### Modified Capabilities
- `shortcuts`: Add a new `S` entry to the `SHORTCUTS` registry (help-overlay only, not status bar) for the "Save as .http" command.

## Impact

- **New code**: `src/core/http-serializer.ts` (pure `ParseResult` → string serializer), `src/components/SaveOverlay.tsx` (clone of `FileLoadOverlay` pattern).
- **Modified code**: `src/core/types.ts` (new `AppMode` value, new `Action` variants, new `AppState` fields for save input/error), `src/core/reducer.ts` (save action handlers mirroring the file-load pattern), `src/app.tsx` (`S` keybinding branch + save side-effect), `src/core/shortcuts.ts` (new `S` entry).
- **No new dependencies**: uses existing `node:fs` (writeFileSync) and the existing `ParsedRequest`/`FileVariable` types.
- **Lossy by design**: Postman folder structure (already flattened to `"A / B"` names during import) is preserved as request names. Form-data text fields, GraphQL bodies, file-upload bodies, and scripts (already dropped during import) cannot be recovered. The serializer operates on the in-memory model, not the original Postman JSON.
