## 1. Config schema and validation

- [ ] 1.1 Add `editor?: string` to `HttptuiConfig` in `src/core/types.ts`
- [ ] 1.2 Parse and validate the `editor` field in `loadConfigFile()` (`src/core/config.ts`) per design.md pseudocode: non-string → stderr `Error: "editor" must be a string in config.json` and treated as unset; empty/whitespace-only → silent unset; otherwise store with leading `~` expanded via `expandLeadingTilde` helper

## 2. Editor resolution and handoff

- [ ] 2.1 Change `resolveEditorCommand()` in `src/core/editor-launcher.ts` to accept an optional `configEditor` parameter, taking precedence over `VISUAL`/`EDITOR`/platform default (empty-after-trim config values fall through to env)
- [ ] 2.2 Add `editor?: string` to `RunEditorHandoffOptions` and pass it through `runEditorHandoff()` to `resolveEditorCommand`

## 3. App plumbing

- [ ] 3.1 Add `editor?: string` to `ExecutorConfig` (`src/core/types.ts`) and `AppState`; wire `createInitialState` and the `LOAD_FILE` reducer case to carry it from `action.executorConfig`
- [ ] 3.2 Pass `editor: httptuiConfig?.editor` in the `executorConfig` prop in `src/cli.tsx`
- [ ] 3.3 In `src/app.tsx`: include `editor: newConfig?.editor` in the `LOAD_FILE` handler's `newExecutorConfig`; pass `editor: state.editor` to `runEditorHandoff` in `performEditorHandoff`

## 4. Tests

- [ ] 4.1 `test/core/config.test.ts`: editor scenarios — valid string with arguments, leading-`~` expansion, empty/whitespace-only silently unset, non-string emits stderr error while certificates still load, project `.httptui.json` editor overrides global in `loadConfig` merge
- [ ] 4.2 `test/core/editor-launcher.test.ts`: precedence matrix — config beats `VISUAL` and `EDITOR`, empty-string config falls through to env, absent config preserves existing `VISUAL` > `EDITOR` > default chain
- [ ] 4.3 `test/integration/editor-handoff.test.tsx`: handoff launches the editor named by config (fake editor script, following the suite's existing child-process pattern) and a project config editor wins over the global one

## 5. Documentation and examples

- [ ] 5.1 `docs/configuration.md`: document the `editor` field — accepted in global and project config, validation behavior, tilde expansion, and that the value is a command (not config-relative)
- [ ] 5.2 `docs/editing.md`: update the resolution order to `editor` config field → `$VISUAL` → `$EDITOR` → default
- [ ] 5.3 README `Ctrl+G` shortcut row and `examples/config/config.json`: reflect that the editor is configurable in config, not only via `$EDITOR`
