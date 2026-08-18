# Design: configurable-editor

## Context

`Ctrl+G` handoff launches an external editor resolved by `resolveEditorCommand()` in `src/core/editor-launcher.ts` — today `VISUAL` → `EDITOR` → `vi`/`notepad`, with no config involvement. Config loading (`loadConfig` in `src/core/config.ts`) already merges global `config.json` with project `.httptui.json` (shallow, project wins per top-level key) and feeds the app through the `ExecutorConfig` prop, which is re-derived on every `LOAD_FILE` (file switch) in `src/app.tsx`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- `editor` field accepted in both config files, validated at load, winning precedence over environment variables at handoff time.
- Editor value refreshes when the user switches files (project config re-discovery), exactly like `certificates` today.

**Non-Goals:**

- Quoting or shell-aware parsing for editor values (pre-existing `$EDITOR` whitespace-split limitation stands; documented workaround: launcher/symlink).
- Tilde expansion for `VISUAL`/`EDITOR` values — env-provided commands keep today's pass-through behavior.
- Relative-editor-path resolution against the config directory — the value is a command, not a config-relative file.
- Any in-app settings UI, per-request editor choice, or new dependencies.

## Decisions

### Decision 1: Precedence — config field beats environment variables

`editor` (merged active config) → `$VISUAL` → `$EDITOR` → platform default. This follows git's `core.editor` model: a value written into httptui's own config is a more deliberate, tool-specific choice than a shell-wide variable. Alternative considered — env-first with config as fallback — rejected: users who set both would expect the config to win, and the fallback ordering makes the config nearly useless for anyone with `EDITOR` exported (which is most terminal users).

### Decision 2: Validation follows the "skip-key" pattern, not the "reject-file" pattern

A non-string `editor` emits `Error: "editor" must be a string in config.json` to stderr and the field is treated as unset, but the rest of the config (certificates, environments) still loads. This mirrors how `environments` handles a wrong type, rather than how a malformed top-level `certificates` returns null for the whole file — a broken editor string must not disable mTLS config. Empty/whitespace-only values are treated as unset silently (they carry no information; noise would be pedantic). Leading `~` expands to `os.homedir()` at config-load time, mirroring `resolveCertPath`'s leading-tilde rule; only the config field gets expansion (see Non-Goals).

### Decision 3: The editor value rides the existing `ExecutorConfig` vehicle

`ExecutorConfig` is already the config-into-app carrier (holds the `insecure` CLI flag alongside `certificates`, so it is not purely executor-facing today), and `LOAD_FILE` already re-derives it from a fresh `loadConfig` on file switch. Adding `editor` there gives runtime re-discovery for free. Alternative — a separate `AppProps.editor` prop — rejected: it would duplicate the LOAD_FILE re-derivation plumbing for zero benefit.

### Decision 4: Launcher API — optional parameter, no signature break

`resolveEditorCommand` gains a second optional parameter; `runEditorHandoff` gains an optional `editor` option. Existing call sites and the test injection seam (`launch` override) are untouched.

## Pseudocode

Config parsing, inside `loadConfigFile()` (after the `environments` block) in `src/core/config.ts`:

```ts
const rawEditor = obj.editor;
if (rawEditor !== undefined && rawEditor !== null) {
  if (typeof rawEditor !== 'string') {
    process.stderr.write('Error: "editor" must be a string in config.json\n');
  } else if (rawEditor.trim() !== '') {
    config.editor = expandLeadingTilde(rawEditor);
  }
}

function expandLeadingTilde(value: string): string {
  return value.startsWith('~') ? path.join(os.homedir(), value.slice(1)) : value;
}
```

Note: `expandLeadingTilde` replaces a leading `~` only; arguments after the executable are untouched, and `~` elsewhere in the string stays literal.

Resolution in `src/core/editor-launcher.ts`:

```ts
export function resolveEditorCommand(env: NodeJS.ProcessEnv = process.env, configEditor?: string): string {
  if (configEditor !== undefined && configEditor.trim() !== '') {
    return configEditor;
  }
  if (env.VISUAL) return env.VISUAL;
  if (env.EDITOR) return env.EDITOR;
  return process.platform === 'win32' ? 'notepad' : 'vi';
}

export interface RunEditorHandoffOptions {
  filePath: string;
  suspend: SuspendTerminal;
  editor?: string; // from the merged active config
  launch?: EditorLauncher;
}

export async function runEditorHandoff(options: RunEditorHandoffOptions): Promise<void> {
  const { filePath, suspend, editor, launch = launchEditor } = options;
  const command = resolveEditorCommand(process.env, editor);
  await suspend(async () => {
    await launch(command, filePath);
  });
}
```

The `trim()` guard in `resolveEditorCommand` is defense-in-depth: `loadConfigFile` never stores an empty value, so the guard only protects direct callers.

Type and state wiring:

```ts
// src/core/types.ts
interface HttptuiConfig   { /* existing */ editor?: string; }
interface ExecutorConfig  { /* existing */ editor?: string; }
interface AppState        { /* existing */ editor?: string; }

// src/core/reducer.ts — createInitialState
editor: props.executorConfig.editor,

// src/core/reducer.ts — LOAD_FILE (extend the existing executorConfig spread)
...(action.executorConfig && {
  certificates: action.executorConfig.certificates,
  editor: action.executorConfig.editor,
}),

// src/cli.tsx — App props
executorConfig={{ insecure, certificates: httptuiConfig?.certificates, editor: httptuiConfig?.editor }}

// src/app.tsx — LOAD_FILE handler
const newExecutorConfig = {
  ...props.executorConfig,
  certificates: newConfig?.certificates,
  editor: newConfig?.editor,
};

// src/app.tsx — performEditorHandoff
await runEditorHandoff({ filePath: state.filePath, suspend: suspendTerminal, editor: state.editor });
```

`parseEditorCommand`, `launchEditor`, suspension, mtime comparison, and reload logic are unchanged — the config layer only changes which command string reaches `launch`.

## Risks / Trade-offs

- [Editor paths containing spaces are misparsed] → Pre-existing `$EDITOR` limitation, unchanged scope; documented in `docs/editing.md` with the launcher/symlink workaround.
- [`ExecutorConfig` accumulates a non-executor field] → Acknowledged drift, consistent with `insecure` precedent; renaming the type is out of scope for this change.
- [Stale editor after file switch] → Not possible: `LOAD_FILE` re-derives `editor` from a fresh `loadConfig(dirname(resolvedPath))`, same as certificates.
- [stderr error for wrong type prints on every config load] → Config loads once at startup and once per file switch — same cadence as existing validation warnings; acceptable.

## Migration Plan

Purely additive. Absent field → `config.editor` stays `undefined` → resolution behaves exactly as today. Rollback is reverting the commit; no config-format migration needed.
