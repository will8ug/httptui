# AGENTS.md — httptui

## What It Is

Interactive terminal UI for `.http`/`.rest` files. Parses HTTP request definitions and sends them via [undici](https://undici.nodejs.org/), rendered as a TUI with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).

## Commands

```bash
npm run build        # tsup — builds ESM bundle to dist/, entry: src/cli.tsx
npm run dev          # tsup --watch (watch mode)
npm test             # vitest run
npm run test:watch   # vitest (watch mode)
npm run lint          # eslint src/ test/
npm run format        # prettier --write src/**/*.ts src/**/*.tsx test/**/*.ts
```

**Build must succeed before tests pass** — `test/cli-smoke.test.ts` spawns `dist/cli.js`, so `npm run build` is a prerequisite for that test.

## Architecture

```
src/
  cli.tsx              # Entrypoint — arg parsing, file loading, alternate screen setup, renders <App>
  app.tsx              # Main component — useReducer state machine, useInput key handling, orchestrates all components
  args.ts              # CLI arg parser (--insecure/-k, positional file path)
  core/
    types.ts           # All shared types: ParsedRequest, ResolvedRequest, AppState, Action (discriminated union), etc.
    parser.ts          # .http file parser → ParseResult { requests, variables }
    executor.ts        # HTTP executor (undici request + TLS handling + error classification)
    variables.ts       # Variable resolution: file vars, $timestamp, $guid, $randomInt, $processEnv, $dotenv
    shortcuts.ts       # Keyboard shortcut definitions (keys → labels → descriptions)
  components/
    Layout.tsx         # Two-column + status bar layout (left: request list, right: response, bottom: status)
    RequestList.tsx     # Left panel — renders request list with selection
    ResponseView.tsx   # Right panel — renders response body/headers with JSON colorization
    StatusBar.tsx      # Bottom bar — file path, request count, insecure flag, reload message
    HelpOverlay.tsx    # ? key overlay
    FileLoadOverlay.tsx # o key overlay for loading a different .http file
  utils/
    request.ts         # URL path extraction for display
    colors.ts          # JSON syntax colorization, status code/method color helpers
```

**Data flow**: `cli.tsx` parses file → passes `ParsedRequest[]` + `FileVariable[]` to `<App>` → `App` manages state via `useReducer(Action)` → user keystrokes dispatch actions → `SEND_REQUEST` triggers `resolveVariables()` then `executeRequest()` → result stored as `ResponseData | RequestError`.

## Key Patterns

- **State management**: Single `useReducer` in `app.tsx` with `Action` discriminated union. No external state library.
- **Component rendering**: Ink (React-like) components. All `.tsx` files use `React.ReactElement` return types.
- **Module system**: Pure ESM (`"type": "module"` in package.json, tsup outputs ESM only, `.js` extensions in imports within `variables.ts`).
- **Path aliases**: `@/*` maps to `./src/*` in tsconfig but NOT used in current source — imports use relative paths.
- **Variable resolution**: Multi-pass — file vars can reference other file vars and system vars; system vars (`$timestamp`, `$guid`, `$randomInt`, `$processEnv`, `$dotenv`) resolved after file vars.
- **.http format**: Subset of VS Code REST Client format. `###` separators, `@name = value` file variables, `{{$systemVar}}` syntax.
- **Error handling**: `executeRequest` returns `ResponseData | RequestError` (discriminated by `isRequestError()` type guard). TLS errors get appended hints about `--insecure` / `NODE_EXTRA_CA_CERTS`.
- **Shortcuts**: `shortcuts.ts` defines all keyboard shortcuts with `showInBar` / `showInHelp` flags. Only 6 shortcuts (`showInBar: true`) appear in the StatusBar; the rest are hidden and only shown in the Help overlay (`?` key).

## Testing

- **Framework**: Vitest with `globals: true` — no need to import `describe`/`it`/`expect` (but all test files currently import them explicitly anyway).
- **Test location**: `test/` directory, pattern `test/**/*.test.ts`.
- **Unit tests**: Pure logic (parser, variables, executor with mocked undici, reducer actions) — no TUI rendering.
- **Smoke test**: `test/cli-smoke.test.ts` spawns `dist/cli.js` as a child process. Requires `npm run build` first.
- **Executor tests**: Use `vi.hoisted()` + `vi.mock('undici')` to mock the HTTP layer.

## Gotchas

- **No eslint/prettier config files at root** — config is apparently managed via defaults or a global config. `npm run lint` and `npm run format` still work.
- **Alternate screen**: `cli.tsx` switches to alternate screen buffer (`\x1B[?1049h`) on startup and restores on exit. TUI tests cannot run in a non-TTY environment without faking `isTTY`.
- **`package-lock.json` is in `.gitignore`** — this is intentional for an npm global-install tool.
- **`tsup.config.ts` externalizes** `react`, `ink`, `@inkjs/ui`, `undici` — these are NOT bundled into dist.
- **Node ≥18 required** (`engines.node`), but the shebang is `#!/usr/bin/env node` (not `--use-system-ca` — see `FUTURE.md`).
- **Stale `rawMode` in test fixtures**: `test/file-load.test.ts` and `test/reload.test.ts` define `rawMode: false` in `createInitialState()`, but `rawMode` was removed from the actual `AppState` type in `src/core/types.ts`. These test files duplicate the reducer logic instead of importing from `app.tsx`, so the drift won't cause runtime failures, but it's misleading when reading tests.