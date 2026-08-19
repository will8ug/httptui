## Context

The `fileLoad` key-handling branch in `src/app.tsx` already performs synchronous filesystem calls (`existsSync`, `readFileSync`) on Enter, and delegates all editing operations to pure `{text, cursor}` buffer functions in `src/core/editor.ts`. The overlay component is presentational; all state lives in the reducer (`fileLoadInput`, `fileLoadCursor`, `fileLoadError`). See proposal.md for motivation and the `file-load` spec delta for the required behavior.

## Goals / Non-Goals

**Goals:**

- Shell-style `Tab` completion computed by a pure, unit-testable function with filesystem access injected.
- Candidate-list state that survives a render but is cleared deterministically by any edit or cursor move.
- No changes to Enter-path resolution, error semantics, or existing input-editing behavior.

**Non-Goals:**

- `~` (home directory) expansion — Enter does not expand it today either; completion stays consistent with that.
- Zsh/fish-style menu cycling through candidates.
- Async or cached directory reads; fuzzy or extension-aware matching.

## Decisions

### 1. Pure completion function with an injected directory listing

`src/utils/path-completion.ts` exports a function shaped like `completePath(buffer: { text: string; cursor: number }, listDir: (dir: string) => Array<{ name: string; isDirectory: boolean }>): CompletionResult`, where `CompletionResult` is `{ text: string; cursor: number; candidates: string[] | null }` (`candidates` is non-null only when the list must be displayed; names carry a trailing `/` for directories).

Rationale: mirrors the existing pure-buffer pattern (`core/editor.ts`), keeps Ink and `node:fs` out of the unit tests, and preserves the `test/utils/` ↔ `src/utils/` symmetry required by the documented test layout. The alternative — performing `readdirSync` inside the reducer — is rejected: reducers must stay pure, and the filesystem would become untestable there.

The function splits the text before the cursor at the last `/` into directory part and partial name, filters the listing by prefix (excluding dotfiles unless the partial starts with `.`), then applies the spec'd semantics: zero matches → return the input unchanged; one match → replace the partial (append `/` for directories); many matches → extend to the longest common prefix, or when that equals the partial, return the input unchanged with `candidates` set. Names longer than the overlay width are not specially handled; the overlay clips.

### 2. Candidate list is explicit reducer state, not derived on render

Add `fileLoadCompletions: string[] | null` to the state, set by the Tab handler and cleared inside the existing `UPDATE_FILE_LOAD_INPUT` and `MOVE_FILE_LOAD_CURSOR` cases (and reset alongside the other `fileLoad*` fields on enter/cancel/load).

Rationale: the spec requires the list to disappear on any edit or cursor movement. A value derived from the input on each render cannot distinguish "ambiguous, list requested" from "ambiguous, user kept typing" without extra tracking — explicit state cleared by the mutating actions is the smallest model that satisfies the clearing rule. Clearing inside the reducer cases (rather than in the key handler) guarantees no dispatch path can forget it.

### 3. Recompute on every Tab; no consecutive-Tab tracking

Each Tab press recomputes from the current input and re-sets (or clears) `fileLoadCompletions`. "Show the list" emerges from "multiple matches with a longest common prefix equal to the partial," so no "was the previous key Tab?" flag is needed and the behavior stays idempotent.

### 4. Synchronous `readdirSync` in the key handler, resolved against the process cwd

The Tab branch calls `readdirSync` once per press, resolving the directory part with `resolve()` exactly as the Enter handler resolves the full path.

Rationale: consistency with the existing synchronous filesystem use in the same handler, and with the cwd semantics the user confirmed. Trade-off accepted below.

## Risks / Trade-offs

- [Synchronous `readdirSync` on a very large directory briefly blocks the UI on Tab] → Accepted: target directories are user-scale API-definition folders; a single synchronous read per keypress matches the handler's existing `existsSync`/`readFileSync` pattern. Revisit only if users report stutter.
- [Mid-cursor completion can produce surprising concatenations (e.g. `usersersX`)] → Accepted: this mirrors shell behavior and is spec'd explicitly, so the oddity is predictable rather than accidental.
- [Unreadable directory (permissions) throws inside the handler] → Catch and treat as zero matches (silent no-op), consistent with the spec's no-match behavior; completion must never surface an error the user didn't ask for.
