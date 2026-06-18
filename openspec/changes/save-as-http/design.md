## Context

httptui parses both `.http` files and Postman collection `.json` files into the same in-memory `ParseResult` shape (`{ requests: ParsedRequest[], variables: FileVariable[] }`). The `.http` parser (`src/core/parser.ts`) is a one-way state machine: text → `ParsedRequest`. No inverse serializer exists — the codebase never writes files in production (confirmed: zero `writeFile`/`appendFile` calls in `src/`).

The TUI is a single-reducer Ink app. All keybindings dispatch from one `useInput` block in `src/app.tsx`. The `FileLoadOverlay` component (`o` key) is the existing modal pattern: hand-rolled text input, `Enter` to confirm, `Esc` to cancel, inline error display. The `SHORTCUTS` array in `src/core/shortcuts.ts` auto-feeds both `StatusBar` (filtered by `showInBar`) and `HelpOverlay` (filtered by `showInHelp`).

The `ParsedRequest` model is already lossy from the Postman import: folder hierarchy is flattened into `name` strings (`"Users / Create User"`), form-data file uploads / GraphQL / scripts are dropped with warnings, and auth is baked into headers. The serializer operates on this simplified model, not the original Postman JSON.

## Goals / Non-Goals

**Goals:**
- Serialize the in-memory `ParseResult` to `.http` file text that the existing `parseHttpFile` parser can read back.
- Provide a `S` keyboard shortcut (help-overlay only) that opens a save-path overlay.
- Default the overlay path to `<collection-basename>.http` in the loaded file's directory.
- Accept absolute paths or paths relative to the loaded file's directory.
- Auto-resolve file-name conflicts by appending ` - N` to the basename with no confirmation.
- Write the file and show a transient status confirmation.

**Non-Goals:**
- Lossless `.http` → `.http` round-trip (comments, whitespace, and exact layout are not preserved by the parser).
- Export back to Postman JSON format.
- Multi-file or per-folder `.http` output (folders are already flattened; one flat file is produced).
- A `.http` format extension for multipart form-data bodies (the format has no multipart syntax).
- In-place editing and save of an already-loaded `.http` file's raw content.
- Native OS file-picker dialog (none exists in `@inkjs/ui`; the hand-rolled overlay pattern is reused).

## Decisions

### Decision: Serializer as a pure function in `src/core/http-serializer.ts`
Export `serializeHttpFile(requests: ParsedRequest[], variables: FileVariable[]): string`. Pure, no I/O, no React imports — lives in `src/core/` alongside `parser.ts` and `postman-parser.ts`, making it unit-testable in isolation. The inverse relationship to `parseHttpFile` is intentional and symmetrical.

**Alternatives considered:**
- Inline serializer in the reducer/app — rejected: untestable, mixes I/O with logic.
- A method on `ParsedRequest` — rejected: the type is a plain interface, not a class; adding methods would break the existing structural pattern.

### Decision: Emit file variables as `@name = value` lines at the top
File-level variables (`FileVariable[]` from `state.fileVariables`, NOT the merged `state.variables`) are written first, one per line, before any request. This matches the `.http` grammar (`@name = value` outside request blocks) and preserves `{{name}}` placeholders in URLs/headers/bodies for round-trippability.

**Alternatives considered:**
- Serialize merged `state.variables` (file + env) — rejected: would bake environment-specific values (potentially secrets) into the file and break `{{var}}` resolution on re-import.
- Inline variable values into requests — rejected: loses the variable abstraction, making the file less maintainable.

### Decision: One request per `###` block, in array order
Each `ParsedRequest` produces a `### <name>` separator, a `METHOD URL` line, header lines, a blank line, and the body (if present). Requests are separated by blank lines. The `name` field (which may contain `" / "` from Postman folder flattening) is written verbatim after `###`.

### Decision: Form-data bodies omitted with an inline comment
When `formdataFields` is present (and `body` is `undefined`), the serializer emits a `# form-data body omitted (N text fields: key1, key2, ...)` comment line in place of the body. This is consistent with the existing warn-and-skip philosophy in `postman-parser.ts` and is honest about the lossy conversion. The `.http` format has no multipart syntax, so inventing one would break round-trippability with the existing parser.

**Alternatives considered:**
- Serialize as `urlencoded` fallback — rejected: wrong `Content-Type`, misleading, data semantics change.
- Extend `.http` format with multipart syntax — rejected: out of scope, parser can't read it back, breaks the "subset of VS Code REST Client" contract.

### Decision: Save overlay mirrors `FileLoadOverlay` pattern
New `SaveOverlay.tsx` component, near-clone of `FileLoadOverlay.tsx` (44 lines). Title "Save as .http", same border/input/error layout. Input is captured in `AppState.saveInput`, dispatched via `UPDATE_SAVE_INPUT` actions (mirroring `UPDATE_FILE_LOAD_INPUT`).

### Decision: Default path = `<collection-basename>.http` in the loaded file's directory
On entering save mode, compute the default from `state.filePath`: replace the extension with `.http`, keep the same directory. For a Postman file `path/to/My Collection.json`, the default is `path/to/My Collection.http`. For a `.http` file `path/to/api.http`, the default is `path/to/api.http` (same name — the user can change it). This value pre-fills `saveInput`.

### Decision: Path resolution — absolute as-is, relative to loaded file's directory
If the user-entered path is absolute, use it directly. If relative, resolve against `path.dirname(state.filePath)`. This matches the user's mental model: "same directory" is the default context.

### Decision: Conflict resolution via ` - N` suffix, no confirmation
Before writing, check `fs.existsSync(targetPath)`. If it exists, increment a counter and try `<basename> - 1.http`, `<basename> - 2.http`, etc. until a free name is found. Write to the first available name. No dialog — the user's intent is "save", not "overwrite". The actual saved path (which may differ from the input) is shown in the transient confirmation message.

**Alternatives considered:**
- Confirmation dialog on conflict — rejected: user explicitly requested no confirmation.
- Overwrite silently — rejected: data loss risk, user might not expect overwrite.
- Refuse and show error — rejected: friction, user has to manually rename.

### Decision: Shortcut `S` with `showInBar: false`, `showInHelp: true`
Added to `SHORTCUTS` in `src/core/shortcuts.ts` with `group: 'request'`. Does not appear in the status bar (preserving the existing 6-item bar budget). Appears in the help overlay under the Request group.

### Decision: New `AppMode` value `'saveLoad'` and save-specific `Action` variants
Mirror the file-load action set: `ENTER_SAVE`, `UPDATE_SAVE_INPUT`, `SAVE_FILE`, `SET_SAVE_ERROR`, `CANCEL_SAVE`. New `AppState` fields: `saveInput: string`, `saveError: string | null`. The actual `writeFileSync` call is a side-effect in `app.tsx` (following the `sendSelectedRequest` async pattern), not in the reducer (which stays pure).

## Risks / Trade-offs

- **[Lossy serialization]** → Form-data text fields, GraphQL bodies, file-upload bodies, scripts, and Postman folder hierarchy are already lost during import. The serializer cannot recover them. Mitigation: the `# form-data body omitted` comment makes the loss visible in the output file.
- **[No overwrite protection]** → The ` - N` suffix strategy means the user never overwrites an existing file, but may accumulate duplicate files. Mitigation: the transient message shows the actual saved path, making duplicates obvious.
- **[Relative path ambiguity]** → Relative paths resolve against the loaded file's directory, not the current working directory. This differs from some CLI conventions. Mitigation: the default path is shown as an absolute path in the overlay, so the user sees the resolved location before confirming.
- **[Shortcut collision]** → `S` is currently unbound in normal mode. If future features claim `S`, there will be a conflict. Mitigation: `S` is semantically "save", a natural fit; document it in the help overlay.
- **[Serializer/parser asymmetry]** → The serializer must produce text the parser can read back, but the parser is more permissive than the serializer is strict. Mitigation: serializer output is constrained to the documented subset; round-trip tests (serialize → parse → compare) will guard against drift.
