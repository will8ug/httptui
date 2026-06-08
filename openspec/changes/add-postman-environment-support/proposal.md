## Why

httptui already supports Postman collection import and a robust variable system (`{{...}}` syntax), but it cannot load external Postman environment files (`.postman_environment.json`). These files are the standard way Postman users manage environment-specific variables (dev, staging, prod) separately from collections. Adding support enables users to run the same collection or `.http` file against different environments without editing the source file.

## What Changes

- Add CLI flag `--env` / `-e` to load a Postman environment file
- Parse `.postman_environment.json` format and extract enabled variables
- Merge environment variables with file/collection variables at load time, with environment taking higher priority
- Support environment files for both Postman collections (`.json`) and `.http` files
- Update reload (`R`) and file-load (`o`) flows to re-apply environment variables
- Add tests for environment file parsing, merging, and integration

## Capabilities

### New Capabilities
- `postman-environment`: Parse and apply Postman environment files (`--env` flag, merging with existing variables)

### Modified Capabilities
- `variables`: Extend variable resolution to accept an overlay of environment variables that take precedence over file/collection variables
- `postman-collection-import`: Add detection for environment files (distinct from collection files) and integration with the new `--env` flow
- `parser`: Ensure `.http` file parsing works seamlessly alongside environment variable overlays

## Impact

- **CLI args** (`src/args.ts`): New `--env` / `-e` flag
- **CLI entry** (`src/cli.tsx`): Load and merge env vars before rendering app
- **App component** (`src/app.tsx`): Store env vars for reload/file-load re-application
- **New parser** (`src/core/postman-env-parser.ts`): Parse `.postman_environment.json`
- **Variable resolution** (`src/core/variables.ts`): Accept overlay map for env vars
- **Types** (`src/core/types.ts`): New types for env parsing result
- **Tests**: Unit tests for parser, integration tests for CLI with `--env`
- **No breaking changes** to existing behavior when `--env` is not used
