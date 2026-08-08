## Context

httptui is a single-reducer Ink app. It loads one source file into `state.filePath`, parses it into a flat `state.requests: ParsedRequest[]` plus file variables, and allows in-session body editing (`e` → `Ctrl+S` commits to memory, setting a file-level `isDirty` flag). The only disk-persistence path today is save-as (`S`): it re-serializes the *entire* in-memory model via `serializeHttpFile(requests, variables)` to a **new** file, refuses when the target already exists, and rebinds `state.filePath` to the written path.

Two facts make in-place save tractable without a data-model change:

1. `ParsedRequest.lineNumber` records the 1-based line of each request's `METHOD url` line in the source file — the anchor for locating a request's block in raw text.
2. `COMMIT_EDIT` is the only mutation (it replaces one request's `body` in place, array length unchanged), so a request "differs from disk" exactly when its `body` differs from a fresh parse of the source.

The `.http` parser is deliberately lossy: comments are dropped, `# @name` is unsupported, header spacing is normalized, and only `### <name>` separators carry names. A full re-serialization therefore destroys comments and layout — acceptable for save-as (a new file), unacceptable for overwriting the user's source file. This design preserves everything except the edited request's block.

## Goals / Non-Goals

**Goals:**
- `Ctrl+S` in normal mode writes edits back to the source file (`state.filePath`), overwriting it.
- Surgical block replacement: only request blocks whose body changed are rewritten; all other content stays byte-identical.
- Rewritten blocks use the canonical serializer form (including a `### <name>` separator), matching what save-as would emit.
- Line-ending (LF/CRLF) and EOF conventions of the source file are preserved; no mixed line endings.
- In-place save is available only for http-format sources; other sources get a hint pointing at `S`.
- Successful in-place save clears `isDirty` and leaves `state.filePath` unchanged.
- No new state fields; the pure builder derives everything from the raw source text + current requests.

**Non-Goals:**
- Lossless round-trip *within* a rewritten block (its comments, header spacing, bare `###`) — normalized by design.
- Editing anything other than bodies (name/method/url/headers stay read-only).
- In-place save for Postman/OpenAPI sources.
- Auto-persisting on edit commit (edit-mode `Ctrl+S` remains commit-to-memory).
- Detecting concurrent external edits to the source file (out of scope; `R` reload exists).
- Multi-file support or per-request source tracking.

## Decisions

### Decision: `Ctrl+S` in normal mode is the in-place-save key

`Ctrl+S` is currently bound only inside the body editor (commit). In normal mode it is unbound (`app.tsx` normal-mode handler binds `S`, `e`, `E`, `o`, `q`, `?`, `v`, `w`, `r`, `d`, `f`, `Tab`, `Ctrl+C`). Binding `Ctrl+S` in normal mode creates the standard editor pairing: `Ctrl+S` = save (to source), `S` = save as. The two meanings are context-disjoint: inside the editor it commits the buffer; outside, it persists the file. A shortcuts-registry entry (`group: 'request'`, help-only) documents it.

**Alternatives considered:**
- Lowercase `s` — rejected: fat-finger risk next to uppercase `S` (save-as) in a keyboard-driven TUI.
- Rework `S` to overwrite when the target equals the source — rejected: silently changes the well-specified save-as conflict contract and blurs the two operations.

### Decision: Diff-based edit detection via re-parse, no per-request dirty state

At save time, re-read and re-parse the source (`parseHttpFile(rawContent)`), then mark request `i` as edited when `currentRequests[i].body !== original.requests[i].body`. Because the only mutation is body edits (same array length, same order), body comparison is precise. This avoids adding per-request dirty tracking to `AppState`.

**Alternatives considered:**
- Track edited indexes in state on `COMMIT_EDIT` — rejected: new state field + reducer plumbing for information that is trivially derived at save time; also drifts if the file changes on disk.
- Replace every block unconditionally — rejected: would normalize non-edited requests too, defeating the purpose of surgical replacement.

### Decision: Surgical block replacement via line scanning

The pure builder `buildInPlaceContent(rawContent, currentRequests)` (new module `src/core/in-place-save.ts`) returns a discriminated result `{ ok: true, content, editedCount } | { ok: false, error }`. It:

1. Splits `rawContent` by `'\n'` (elements may carry a trailing `'\r'`; `'\n'` is the only separator).
2. Locates each edited request's block:
   - **blockStart**: the nearest line matching `^#{3,}` (after `trim()`) above the request line, else the request line itself.
   - **blockEnd**: the line before the next `^#{3,}` line, else the last line.
   - Trailing blank lines are trimmed from the region (preserving the inter-block gap and any file-tail blank lines byte-identically).
3. Regenerates the block with `serializeRequestBlock(request)` (exported from `http-serializer.ts`), converts it to the source file's line ending, and splices it in.

Regions are computed against the original line array, then applied **bottom-up** (highest `blockStart` first) so earlier indices stay valid. Regions of disjoint edited blocks cannot overlap because the parser guarantees a separator terminates every request body, so the "next `^#{3,}`" scan always lands on the next request's separator.

**Alternatives considered:**
- Full re-serialization with `serializeHttpFile(state.requests, state.fileVariables)` and `writeFileSync(state.filePath, ...)` — rejected: destroys every comment and layout structure in the file; the save-as design doc explicitly lists lossless `.http`→`.http` round-trip as a non-goal, and in-place overwrite makes that loss unacceptable.
- Body-region-only replacement (splice only the text after the first blank line following the headers) — rejected after discussion: more edge cases (inserting a body where none existed, removing an empty body, no-headers requests) for marginal gain; the user chose block replacement.

### Decision: Always emit the `### <name>` separator line

`serializeRequestBlock` already emits `### ${request.name}` first. A blind replacement would inject `### Request N` into a file whose first request had no separator — but that is accepted and made canonical:

- Named separator `### Foo` → preserved as `### Foo`.
- Bare `###` → normalized to `### Request N` (parse-identical; the parser already auto-named it).
- No separator (only possible for the *first* request — the parser requires a separator to end every prior request) → gains `### Request N`.

Comments *above* a separator-less first request survive because they lie outside the replaced region (the region starts at the request line). This is simpler than conditionally omitting the separator (no serializer signature change, no strip-first-line logic) and makes in-place output identical to what save-as would emit for the same request.

### Decision: Gate on source format via `detectFormat`

The `Ctrl+S` handler reads the raw content, calls `detectFormat(state.filePath, rawContent)`, and only proceeds when it returns `'http'` (which covers `.http`, `.rest`, and any non-JSON/YAML file parsed as http). For `'postman'`/`'openapi'` it dispatches a transient message pointing at `S` and writes nothing — in-place writing of `.http` syntax into a `.json`/`.yaml` would corrupt it. This mirrors the load path exactly (`parseAnyFormat` uses the same detector).

### Decision: Preserve the source file's line-ending convention

The raw `readFileSync(path, 'utf8')` preserves on-disk bytes. The builder detects `rawContent.includes('\r\n')` and, when true, converts the regenerated block's `\n` to `\r\n` before splicing. Untouched regions keep their original line endings byte-for-byte; a CRLF file stays uniformly CRLF, an LF file stays uniformly LF. The split/join round-trip preserves EOF (a trailing `\n` yields a final empty array element that the join restores).

### Decision: Guard against separator lines in edited bodies

If any edited body contains a line matching `^#{3,}` (after `trim()`, matching the parser's separator rule), the builder returns `{ ok: false, error }` and nothing is written. Without the guard, the written file would split that request on reload. This is a new persistence risk introduced by in-place save (before it, a separator-in-body existed only in memory).

### Decision: Reuse the `SAVE_FILE` reducer action for the post-write state

On success the handler dispatches `{ type: 'SAVE_FILE', message, filePath: state.filePath }`. `SAVE_FILE` already sets `mode: 'normal'`, clears `isDirty`, sets the transient message, and clears save-input/error — and rebinding `filePath` to the same value is a no-op. This keeps the "any successful save clears the flag" contract in one code path (see the **unsaved-changes** spec) without a new action.

### Decision: No-op when nothing differs

When `editedCount === 0` (no body differs from disk), the handler writes nothing and shows no message — matching editor convention for a clean `Ctrl+S`. The `isDirty` flag is already unset in that case.

## Risks / Trade-offs

- **[Edited block normalization]** → The edited request's own comments (between separator and request line, or among headers), bare `###`, and header spacing are regenerated in canonical form. Mitigation: accepted by design (the user chose block replacement); comments in *non-edited* blocks and above separator-less first requests are preserved.
- **[`###`-in-body corruption]** → A written body containing a `^#{3,}` line would split the request on reload. Mitigation: hard refusal with a transient message before any write.
- **[Concurrent external edits clobbered]** → In-place save writes from the in-memory model onto a re-read of the file; an external change to a non-edited region survives (byte-identical), but a change to an edited request's block is overwritten. Mitigation: `R` reload exists; no mtime check (out of scope).
- **[Bare `###` normalization]** → `###` becomes `### Request N`. Cosmetic and parse-identical; the auto-name was already "Request N" in memory.
- **[Mixed line endings if detection is naive]** → Mitigation: EOL conversion of the regenerated block before splicing; split/join round-trips untouched regions exactly.
- **[`Request N` auto-naming drift]** → Deterministic (`requestCount`-based) and stable after save (the file now contains the explicit separator), so no numbering drift across repeated saves.

## Migration Plan

No migration: purely additive. No rollback concerns beyond reverting the change commit. The first in-place save of a file whose first request lacks a separator adds one `### Request N` line — a one-time, parse-identical normalization.

## Open Questions

- Whether edit-mode `Ctrl+S` should also persist in one step (commit + write) — explicitly deferred; the current design keeps commit-to-memory in the editor and save-to-disk in normal mode.
