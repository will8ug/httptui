## Context

httptui currently discovers configuration exclusively from a global config file (`~/.config/httptui/config.json` or platform equivalent). This is fine for personal use but makes it hard to share request collections in teams: certificates must be referenced from the user's home directory, and `.env` files are resolved from `process.cwd()` rather than the `.http` file's directory.

The previous change (`add-ssl-client-certificates`) established global config support. This change extends that to support a project-level `.httptui.json` sidecar file, merged with the global config so project settings override global ones.

## Goals / Non-Goals

**Goals:**
- Discover `.httptui.json` in the same directory as the `.http` file
- Merge project config with global config: project wins on all top-level key conflicts
- Re-discover config when the user switches `.http` files at runtime (`LOAD_FILE`)
- Resolve relative paths in project config against the project config's directory
- Fix `$dotenv` implementation to match existing spec (read from `.http` file's directory first, then CWD)

**Non-Goals:**
- Walking up parent directories looking for `.httptui.json` (only same directory as `.http` file)
- Deep merging of nested objects (shallow merge only)
- CLI flag to specify a config file path
- Interactive config editor inside the TUI

## Decisions

### Decision 1: `.httptui.json` as the project config file name
**Rationale**: Hidden dotfiles are the conventional pattern for tool-specific configuration (`.eslintrc`, `.prettierrc`, `.npmrc`). Using `.httptui.json` makes it clear this is a tool config and keeps the project root clean. The `.json` extension makes it obvious to editors and humans what the format is.
**Alternatives considered**: `httptui.config.json` (too verbose for a sidecar), `.httptuirc` (no extension, harder for editors). `.httptui.json` is the sweet spot.

### Decision 2: Shallow merge, project wins
**Rationale**: A shallow merge (top-level keys only) is simpler to reason about and sufficient for the current config structure. The `certificates` object is a top-level key; if the project defines `certificates`, it fully replaces the global `certificates` for that session. This avoids ambiguous deep-merge semantics (e.g., what if global has cert A for `*.example.com` and project has cert B for `api.example.com`?).
**Alternatives considered**: Deep merge (too complex), no merge / single-file-only (would force duplication of shared settings). Shallow merge is the pragmatic choice.

### Decision 3: Re-discover config on `LOAD_FILE`
**Rationale**: When a user presses `o` to open a different `.http` file, they might be switching to a completely different project. Keeping the old config would be surprising. Re-discovering ensures the new file's project config is loaded.
**Alternatives considered**: Static config (load once at startup) — simpler but would require restarting httptui when switching projects. Dynamic is the correct behavior for a multi-file tool.

### Decision 4: Pass `.http` file directory through the call chain
**Rationale**: The config loader needs to know where to look for `.httptui.json`. The cleanest approach is to pass the directory from `cli.tsx` → `loadConfig(projectDir)` and from `app.tsx` → `loadConfig(projectDir)` on `LOAD_FILE`. The config module remains pure and testable.
**Alternatives considered**: Using `process.cwd()` as the search base — rejected because the TUI might be launched from a different directory than the `.http` file.

### Decision 5: Fix `$dotenv` to match existing spec
**Rationale**: The variables spec already requires `$dotenv` to look in the `.http` file's directory first, then fall back to CWD. The implementation currently only checks CWD. This is a bugfix that aligns implementation with spec, not a behavioral change.

## Risks / Trade-offs

- **Risk**: Shallow merge means if a project config defines `certificates`, ALL global certificates are replaced, not just the ones the project overrides. → **Mitigation**: Document this clearly. For most use cases, project certs are self-contained anyway.
- **Risk**: `$dotenv` fix might break users who relied on CWD-relative `.env` behavior. → **Mitigation**: This is a bugfix matching the documented spec. The fallback to CWD preserves backward compatibility for users who don't have `.env` next to their `.http` file.
- **Risk**: Config re-discovery on `LOAD_FILE` could fail if the new file is in a directory without a `.httptui.json` and the user expected global config to still apply. → **Mitigation**: Global config is always loaded and merged, so missing project config just means global-only behavior.

## Migration Plan

No migration needed. This is an additive feature. Existing users with only global config continue to work unchanged.

## Open Questions

None at this time.
