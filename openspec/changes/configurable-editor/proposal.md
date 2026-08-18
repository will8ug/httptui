# Proposal: configurable-editor

## Why

The `Ctrl+G` external-editor handoff resolves its editor only from `$VISUAL`/`$EDITOR` environment variables. Users who prefer a different editor for httptui than for their shell — or who use GUI editors requiring a wait flag like `code --wait` — must export variables in every shell session. A config-file field gives httptui-specific, persistent control, following the convention git established with `core.editor`.

## What Changes

- New optional top-level `editor` field (string) in the global `config.json` and in the project `.httptui.json` sidecar.
- Editor command resolution gains a highest-priority layer: active config `editor` → `$VISUAL` → `$EDITOR` → platform default (`vi`/`notepad`). A project config `editor` overrides a global one via the existing shallow merge.
- Validation of the field: whitespace-only values are treated as unset (silently); a non-string value emits an error to stderr and is treated as unset while the rest of the config loads; a leading `~` expands to the home directory.
- The value keeps `$EDITOR` semantics: split on whitespace into executable plus arguments, so `"editor": "code --wait"` works and paths containing spaces are out of scope (documented workaround: launcher/symlink).
- Everything else about the handoff is unchanged: terminal suspension, argument ordering, exit-status handling, mtime-based reload, and the env-var fallback chain when the field is absent or ignored.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `global-config`: schema and validation gain the optional `editor` field — type rules, empty-value handling, wrong-type handling, and leading-`~` expansion.
- `editor-handoff`: the "Editor command resolution" requirement gains the config layer at the top of the precedence chain; scenario coverage for config-beats-env, fallback-when-absent, and project-overrides-global.

Project-level acceptance of the field needs no `project-level-config` delta: that spec already mandates same-schema validation for `.httptui.json` and generic top-level-key precedence in the shallow merge.

## Impact

- Code: `src/core/types.ts` (`HttptuiConfig`, `ExecutorConfig`, `AppState`), `src/core/config.ts` (parse/validate/expand), `src/core/editor-launcher.ts` (`resolveEditorCommand`, `runEditorHandoff`), `src/app.tsx` (plumb editor into handoff and `LOAD_FILE` re-discovery), `src/cli.tsx` (pass field into `ExecutorConfig`), `src/core/reducer.ts` (state field).
- Tests: `test/core/config.test.ts`, `test/core/editor-launcher.test.ts`, `test/integration/editor-handoff.test.tsx`.
- Docs: `docs/configuration.md`, `docs/editing.md`, README shortcut table, `examples/config/config.json`.
- Dependencies: none added. No breaking changes — an absent or ignored field preserves today's behavior exactly.
