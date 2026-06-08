## Context

httptui already imports Postman collections and resolves `{{...}}` variables via a two-pass system: file variables first, then system/env variables (`{{$timestamp}}`, `{{$processEnv}}`, etc.). Postman users commonly maintain separate `.postman_environment.json` files containing environment-specific values (dev, staging, prod). Currently, httptui has no way to load these files, forcing users to either inline values into collections or rely on `{{$processEnv}}` workarounds.

The codebase uses `FileVariable[]` as the universal variable representation. A variable is a name-value pair; the resolution engine doesn't care where it came from. This means adding environment file support is primarily about:
1. Parsing the JSON environment format
2. Storing the parsed variables for re-application on reload
3. Merging them with existing variables at resolution time

## Goals / Non-Goals

**Goals:**
- Allow users to load Postman environment files via `--env` / `-e` CLI flag
- Apply environment variables to both `.http` files and Postman collections
- Ensure environment variables override file/collection variables (standard Postman precedence)
- Preserve environment variable application across reload (`R`) and file-load (`o`) actions
- Gracefully skip disabled (`enabled: false`) environment variables

**Non-Goals:**
- Auto-discovery of environment files (no naming convention magic)
- In-TUI environment switching (no hotkey or overlay)
- Secret masking for `type: "secret"` variables
- Writing/exporting environment files back to disk
- Support for environment file formats other than Postman's `.postman_environment.json`

## Decisions

### 1. Support both `.http` and `.json` files
**Rationale:** The merge logic is identical for both formats, and restricting to collections only introduces extra branching (need to clear env vars when loading `.http` after a collection). Supporting both is simpler and more useful.
**Alternative considered:** Collections only — rejected because it adds format-checking complexity and a "clear env on .http load" edge case.

### 2. Environment variables override file/collection variables
**Rationale:** Matches Postman's own precedence (environment > collection). Also matches user intent: passing `--env` signals an explicit desire to override.
**Alternative considered:** File variables > environment — rejected because it contradicts the purpose of `--env`.

### 3. Store parsed environment variables in `AppState`
**Rationale:** Reload (`R`) re-reads the file from disk and re-parses, producing a fresh `FileVariable[]`. We need the environment variables available at that point to re-merge. Storing them in state (as `FileVariable[]` or similar) keeps the reload flow clean.
**Alternative considered:** Re-parse env file on every reload — rejected because it adds I/O on every `R` keypress without benefit.

### 4. Parse env file at CLI startup, not inside `postman-parser.ts`
**Rationale:** The env parser is independent of collection parsing. Keeping it separate (`postman-env-parser.ts`) follows the existing `postman-parser.ts` pattern and keeps concerns isolated.

### 5. Add `--env` to `args.ts`, not just `cli.tsx`
**Rationale:** Consistent with how `--insecure` / `-k` is handled. Args parsing is centralized.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Users expect `--env` to work with `.env` files | Name is `--env` not `--dotenv`; document clearly that this is for Postman `.postman_environment.json` files |
| Large environment files slow startup | Parse once at startup; env files are typically small (<100 vars) |
| Variable name collisions between env and file vars | Documented behavior: env wins; no silent surprises |
| Existing tests break if merge logic is wrong | Add dedicated tests for merge precedence |

## Migration Plan

No migration needed. This is an additive feature with no breaking changes. Existing behavior is unchanged when `--env` is omitted.

## Open Questions

None. All decisions are resolved.
