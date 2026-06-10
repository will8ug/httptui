## Context

Currently, httptui supports loading environment variables via Postman environment files (`.postman_environment.json`) using the `--env` / `-e` CLI flag. The parser (`postman-env-parser.ts`) is field-agnostic and already handles the simplified format correctly, but the system does not expose a way to reference environment files by name or configure them in config files.

The user wants to add a simplified environment format and a way to reference environments by name in config files (global or project-level).

## Goals / Non-Goals

**Goals:**
- Support a simplified environment file format that is compatible with Postman but omits Postman-specific fields.
- Allow environment files to be registered in `config.json` or `.httptui.json` under an `environments` array.
- Add a `--env-name` / `-E` CLI flag to select an environment by name from the config.
- Ensure `--env` and `--env-name` are mutually exclusive.
- Reuse the existing parser logic for both formats.

**Non-Goals:**
- TUI environment switcher (out of scope).
- Default environment selection (no default environment for now).
- Support for other environment formats (e.g., `.env` files).
- Environment file validation beyond JSON parsing.

## Decisions

### Parser Reuse
**Decision:** The existing `parsePostmanEnvironment` function is already fully compatible with the simplified format. It only looks at `name`, `values`, `key`, `value`, and `enabled`. It ignores all other fields. Therefore, no parser logic changes are needed.
**Rationale:** The simplified format is structurally a subset of the Postman format. Reusing the same parser avoids duplication and reduces maintenance.

### File Renaming
**Decision:** Rename `postman-env-parser.ts` to `env-parser.ts` and rename the function to `parseEnvironmentFile`.
**Rationale:** The file name is currently misleading because it will handle both Postman and simplified formats. The function name should reflect its generic purpose.

### CLI Flag Strategy
**Decision:** Add `--env-name` (with `-E` as short form) alongside the existing `--env` / `-e` flag. Only one of these two flags can be specified at a time.
**Rationale:** The user explicitly requested Option B (separate flag) to avoid ambiguity. `-E` is a natural short form since `-e` is already taken.

### Config Merge Strategy
**Decision:** Keep the existing shallow-replace merge strategy for config files.
**Rationale:** The user explicitly requested consistency. If both global and project configs define `environments`, the project config's `environments` array will replace the global one entirely.

### Environment File Path Resolution
**Decision:** Use the existing `resolveCertPath` logic for resolving environment file paths from config.
**Rationale:** This is already established behavior in httptui. Relative paths in global config resolve against the global config directory; relative paths in project config resolve against the project config directory.

## Risks / Trade-offs

- **Risk:** If both `--env` and `--env-name` are specified, the CLI should reject it. This adds a small amount of validation logic.
- **Risk:** If the config file defines an `environments` array but the user specifies `--env-name` with a name that doesn't exist, the CLI should exit with an error.
- **Risk:** Renaming `postman-env-parser.ts` is a minor breaking change for internal imports, but it's not a public API.
- **Trade-off:** Shallow-replace merge means users can't combine global and project environments. They must choose one or the other. This is consistent with current behavior but may be slightly less flexible.

## Migration Plan

No migration needed. This is a backward-compatible addition. Existing `--env` usage continues to work.

## Open Questions

- None at this time.
