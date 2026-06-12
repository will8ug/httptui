## Context

`loadConfig()` in `config.ts` merges global and project configs using object spread:

```ts
return { ...globalConfig, ...projectConfig, configDir: projectDir };
```

This sets a single `configDir` to the project directory. But `environments` entries may have come from the global config, and their relative `file` paths should resolve against the global config directory (`~/.config/httptui/`), not the project directory. The same bug affects `certificates` — global cert paths also resolve against the wrong base when a project config exists.

**Current flow (broken):**

```
loadConfig("examples/")
  → globalConfig: { environments: [{name:"LocalAPI", file:"env/local-quick-test-apis.json"}] }
  → projectConfig: { certificates: {...} }
  → merged: { environments: [...], certificates: {...}, configDir: "examples" }
                                                         ↑ WRONG for environments

cli.tsx:
  baseDir = config.configDir = "examples"
  resolveCertPath("env/local-quick-test-apis.json", "examples")
  → /project/examples/env/local-quick-test-apis.json  ← DOES NOT EXIST
```

## Goals / Non-Goals

**Goals:**
- Fix path resolution for **both** environment files and certificate files when configs are merged from different sources.
- Eliminate the root cause: resolve all relative paths to absolute at config load time, so the merge step and all downstream consumers are path-source-agnostic.
- Remove `configDir` from `HttptuiConfig`, `ExecutorConfig`, and `AppState` — it becomes unnecessary once paths are pre-resolved.
- Add regression tests for the mixed-config scenario.

**Non-Goals:**
- Changing the existing spec requirements (they already describe the correct behavior).
- Changing the `resolveCertPath()` function itself — it remains useful for `~` expansion and is still called internally.

## Decisions

### Decision: Resolve all relative paths to absolute during `loadConfigFile()`

Each call to `loadConfigFile(configPath)` already knows the config file's location. Use `dirname(configPath)` as the base directory to resolve all relative paths (both `cert`/`key`/`pfx`/`ca` in certificates and `file` in environments) to absolute paths before returning the parsed config.

**After this change, the merge is trivial:**

```
loadConfigFile(globalConfigPath)
  → { environments: [{name:"LocalAPI", file:"/home/user/.config/httptui/env/local.json"}],
      certificates: {"localhost": {cert:"/home/user/.config/httptui/certs/client.crt", ...}} }

loadConfigFile(projectConfigPath)
  → { certificates: {"localhost": {cert:"/project/examples/certs/client.crt", ...}} }

merge: { ...globalConfig, ...projectConfig }
  → { environments: [{name:"LocalAPI", file:"/home/user/.config/httptui/env/local.json"}],
      certificates: {"localhost": {cert:"/project/examples/certs/client.crt", ...}} }
```

Every path is already absolute. No `configDir` needed. Downstream consumers (`cli.tsx`, `app.tsx`, `certificates.ts`) call `resolveCertPath()` which sees an absolute path and returns it as-is.

**Why this over alternatives:**

- **Alternative: Track origin directory per section (`environmentsConfigDir`, `certificatesConfigDir`).** Minimal code change, but introduces N tracking fields for N config sections. Doesn't scale — every new path-bearing config section needs a corresponding `*ConfigDir` field. The merge logic becomes a matrix of "which source provided this section."

- **Alternative: Two configDirs (`globalConfigDir` + `projectConfigDir`).** Doesn't handle the case where both configs define different sections. Still requires per-section logic to pick the right dir.

- **Chosen approach** eliminates the entire class of bug. One resolution step at load time, zero bookkeeping at merge or consumption time. The trade-off is a larger diff: `configDir` is removed from three types and ~14 test assertions need updating. But the result is simpler code, not more complex code.

### Decision: Remove `configDir` from the type system

Since all paths are pre-resolved, `configDir` serves no purpose. Remove it from:
- `HttptuiConfig` (config.ts return type)
- `ExecutorConfig` (types.ts, passed to executor)
- `AppState` (types.ts, stored in reducer state)

This cascades to:
- `loadConfig()` — no longer sets `configDir` in the return value
- `reducer.ts` — no longer stores `configDir` in initial state or `LOAD_FILE` action
- `app.tsx:117` — `loadCertFiles` no longer needs `configDir`; pass any string (cert paths are absolute, so `resolveCertPath` returns them as-is)
- `app.tsx:177-181` — `newExecutorConfig` no longer includes `configDir`
- `cli.tsx:88-89` — `baseDir` for env resolution is no longer needed; `resolveCertPath(match.file, '')` works since `match.file` is already absolute

### Decision: Keep `resolveCertPath()` as-is

`resolveCertPath()` still handles `~` expansion and absolute-path passthrough. It's called from `certificates.ts` and `cli.tsx`. After this change, it will always receive absolute paths and return them unchanged — but keeping it provides a safety net and avoids removing a public utility.

## Risks / Trade-offs

- **[Larger diff than Option 1]** → ~14 existing test assertions reference `configDir` and need updating. Mitigated by the fact that the change is mechanical (remove the field from expected objects).
- **[Runtime file-load path in `app.tsx`]** → When the user loads a new `.http` file at runtime, `loadConfig()` is called again. The new config's paths are already resolved, so the same fix applies automatically. No special handling needed.
- **[`resolveCertPath` becomes mostly a no-op]** → It still handles `~` expansion for any edge case where a path wasn't resolved at load time. Keeping it is low cost.
