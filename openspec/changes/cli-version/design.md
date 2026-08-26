## Context

The CLI parses arguments in `src/args.ts` (hand-rolled flag sets: boolean, env-file, env-name) and runs top-level guards in `src/cli.tsx` (usage error → file-not-found → env conflict → parse → render). Unknown flags currently fall through to the positional file path. The project builds with tsup (esbuild, single ESM bundle `dist/cli.js`), tests with vitest, and `tsconfig.json` already sets `resolveJsonModule: true`. See proposal.md — Why.

## Goals / Non-Goals

**Goals:**
- Version string sourced from `package.json` with no second copy to keep in sync.
- Correct behavior in all three execution modes: installed bundle (`dist/cli.js`), vitest (unbundled `src/`), and `tsc --noEmit`.
- Zero build-config changes.

**Non-Goals:**
- `-h`/`--help` flag (separate concern; usage error message stays as-is).
- Any change to existing flag parsing semantics beyond recognizing the two new flags.

## Decisions

### Decision 1: Source the version via static JSON import, not a runtime read

`src/version.ts`:
```ts
import { version } from '../package.json' with { type: 'json' };
export { version };
```

Rationale: community survey of 8 popular Node CLIs (vitest, tsup, tsx, yarn berry, pnpm, Prettier, ESLint, commander.js) showed every bundled CLI bakes the version at build time; only unbundled ESLint does a runtime `require('../../package.json')`. httptui ships a tsup bundle, so it belongs in the bundled camp. tsup/esbuild inlines the JSON import into `dist/cli.js` as a literal (this is tsup's own published pattern), vitest/Vite resolves the JSON import natively from `src/`, and `tsc --noEmit` accepts it via the existing `resolveJsonModule`.

Alternatives rejected:
- **Runtime `createRequire(import.meta.url)` + `require('../package.json')`** — works for this layout (npm always ships package.json next to `dist/`), but is the outlier pattern across surveyed tools, adds a live filesystem dependency whose resolution root differs between `src/` and `dist/`, and puts a bundler-hostile `require` call in ESM output.
- **tsup `define` injection** (yarn berry's pattern) — requires config in tsup *and* vitest *and* a global `.d.ts` for `tsc`; config sprawl for zero benefit over the JSON import.
- **Hand-maintained `version.ts` constant** (pnpm's pattern, minus the tooling) — second copy that drifts on every release.

### Decision 2: Recognize the flags as a new boolean set in `args.ts`

Add `VERSION_FLAGS = new Set(['--version', '-v'])` alongside `BOOLEAN_FLAGS`, parse it to a `version: boolean` field, and skip the flags so they never become the positional `filePath`. Matches the existing parser's structure; no new parsing mechanism.

### Decision 3: Early exit in `cli.tsx`, before the usage guard

```ts
import { version as releasedVersion } from './version';

const { filePath, insecure, envPath, envName, version } = parseArgs(process.argv);

if (version) {
  console.log(releasedVersion); // bare "0.7.0", stdout
  process.exit(0);
}

if (!filePath) { ... } // existing guards unchanged
```

(`version` the destructured boolean vs `releasedVersion` the imported string — kept distinct so the flag check and the printed value can't be confused.)

Placed before `if (!filePath)` so `httptui --version` prints the version rather than the usage error (spec: Version check precedes usage validation). Uses `console.log` + `exit(0)` — the mirror of the existing `exitWithError` (stderr + exit 1).

## Risks / Trade-offs

- [JSON import attributes (`with { type: 'json' }`) require newer tooling] → Node 24 is the project's engine floor and esbuild/tsup/vitest all support the syntax; `resolveJsonModule` already on. If lint complains about the import-attribute syntax, drop the attribute — plain `import { version } from '../package.json'` behaves identically under tsup and vitest.
- [Bundle prints the version baked at build time, so a stale build shows a stale version] → Same trade-off as vitest/tsup/tsx; a rebuild is part of every release anyway (`npm version` → `npm run build`).
- [`-v` is conventionally "verbose" in some CLIs] → httptui has no verbose flag; no conflict now, and adding one later would use `-V`/`--verbose` by convention.
