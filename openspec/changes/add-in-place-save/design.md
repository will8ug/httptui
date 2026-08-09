## Context

httptui is a single-reducer Ink app. It loads one source file into `state.filePath`, parses it into a flat `state.requests: ParsedRequest[]` plus file variables, and allows in-session body editing (`e` → `Ctrl+S` commits to memory). Each `ParsedRequest` carries an `isDirty` marker (from the archived **per-request-unsaved-changes** change): a committed edit that changes a request's stored value sets it, it is never un-set by further edits (tombstone), and the file-level unsaved-changes flag is derived via `hasUnsavedChanges(requests)` (`src/utils/request.ts`). The only disk-persistence path today is save-as (`S`): it re-serializes the *entire* in-memory model via `serializeHttpFile(requests, variables)` to a **new** file, refuses when the target already exists, and rebinds `state.filePath` to the written path.

Two existing facts make in-place save tractable without extending the data model:

1. `ParsedRequest.lineNumber` records the 1-based line of each request's `METHOD url` line in the source file — the anchor for locating a request's block in raw text, re-derived fresh at save time because a prior in-place save shifts the file.
2. The per-request `isDirty` marker answers "which requests did the user edit in-session?" — the edited set, with no body-diff needed. `COMMIT_EDIT` is the only mutation, and it sets the marker on exactly one request.

The `.http` parser is deliberately lossy: comments are dropped, `# @name` is unsupported, header spacing is normalized, and only `### <name>` separators carry names. A full re-serialization therefore destroys comments and layout — acceptable for save-as (a new file), unacceptable for overwriting the user's source file. This design preserves everything except the edited request's block.

## Goals / Non-Goals

**Goals:**
- `Ctrl+S` in normal mode writes edits back to the source file (`state.filePath`) after a confirmation prompt, overwriting it.
- Surgical block replacement: only request blocks whose `isDirty` marker is set are rewritten; all other content stays byte-identical.
- Rewritten blocks use the canonical serializer form (including a `### <name>` separator), matching what save-as would emit.
- Line-ending (LF/CRLF) and EOF conventions of the source file are preserved; no mixed line endings.
- In-place save is available only for http-format sources; other sources get a hint pointing at `S`.
- Successful in-place save clears every request's `isDirty` marker (via the reused `SAVE_FILE`) and leaves `state.filePath` unchanged.
- No new state fields; the change consumes the existing per-request `isDirty` tracker. The pure builder takes the raw source text + current requests.

**Non-Goals:**
- Lossless round-trip *within* a rewritten block (its comments, header spacing, bare `###`) — normalized by design.
- Editing anything other than bodies (name/method/url/headers stay read-only).
- In-place save for Postman/OpenAPI sources.
- Auto-persisting on edit commit (edit-mode `Ctrl+S` remains commit-to-memory).
- Detecting concurrent external edits to the source file beyond the structural guard (out of scope; `R` reload exists).
- Extending the per-request tracker (consumed as-is, not modified) or surfacing per-request markers in the request list.

## Decisions

### Decision: `Ctrl+S` in normal mode is the in-place-save key

`Ctrl+S` is currently bound only inside the body editor (commit). In normal mode it is unbound (`app.tsx` normal-mode handler binds `S`, `e`, `E`, `o`, `q`, `?`, `v`, `w`, `r`, `d`, `f`, `Tab`, `Ctrl+C`). Binding `Ctrl+S` in normal mode creates the standard editor pairing: `Ctrl+S` = save (to source), `S` = save as. The two meanings are context-disjoint: inside the editor it commits the buffer; outside, it persists the file. A shortcuts-registry entry (`group: 'request'`, help-only) documents it.

**Alternatives considered:**
- Lowercase `s` — rejected: fat-finger risk next to uppercase `S` (save-as) in a keyboard-driven TUI.
- Rework `S` to overwrite when the target equals the source — rejected: silently changes the well-specified save-as conflict contract and blurs the two operations.

### Decision: Edited set from the per-request `isDirty` marker; re-parse retained for block geometry

The edited set is the requests whose `isDirty` marker is set — the tracker's answer to "which requests did the user change in-session?" No body comparison is needed to detect edits. The builder still re-reads and re-parses the source at save time, but only to re-derive each marked request's block position: stored `lineNumber`s go stale after an in-place save shifts the file, so the fresh parse provides correct geometry. A structural guard refuses when the re-parse yields a different request count than the in-memory state (the file changed shape outside the app).

Because the marker is tombstone, a request edited then reverted to its original body remains marked and its block IS rewritten in canonical form on the next in-place save. This is consistent with the **per-request-unsaved-changes** contract ("reverting keeps the marker set"), and the rewrite clears the marker so the file-level `*` indicator resolves rather than becoming stuck.

**Alternatives considered:**
- Pure re-parse body-diff (the original design) — rejected: obsolete once the tracker exists, and it would treat an externally changed but untouched request as "edited", rewriting its block from stale memory and clobbering the external change.
- Marker ∧ body-diff conjunction — rejected: a reverted request would then be excluded from the write while its tombstone marker stays set, leaving the `*` indicator permanently stuck with no save path that clears it. The canonical rewrite on revert is the cleaner resolution.
- Replace every block unconditionally — rejected: would normalize unmarked requests too, defeating the purpose of surgical replacement.

### Decision: Surgical block replacement via line scanning

The pure builder `buildInPlaceContent(rawContent, currentRequests)` (new module `src/core/in-place-save.ts`) returns a discriminated result `{ ok: true, content, editedCount } | { ok: false, error }`. It:

1. Splits `rawContent` by `'\n'` (elements may carry a trailing `'\r'`; `'\n'` is the only separator).
2. Re-parses `rawContent` with `parseHttpFile` to obtain fresh per-request `lineNumber`s. Refuses (`ok: false`) if the re-parse yields a different request count than `currentRequests` — a structural external change that would misalign block positions.
3. Determines the edited set from the requests whose `isDirty` marker is set; returns `{ ok: true, content: rawContent, editedCount: 0 }` when it is empty.
4. Locates each marked request's block:
   - **blockStart**: the nearest line matching `^#{3,}` (after `trim()`) above the request line, else the request line itself.
   - **blockEnd**: the line before the next `^#{3,}` line, else the last line.
   - Trailing blank lines are trimmed from the region (preserving the inter-block gap and any file-tail blank lines byte-identically).
5. Regenerates the block with `serializeRequestBlock(request)` (exported from `http-serializer.ts`), converts it to the source file's line ending, and splices it in.

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

### Decision: Guard against separator lines in marked bodies

If any marked body contains a line matching `^#{3,}` (after `trim()`, matching the parser's separator rule), the builder returns `{ ok: false, error }` and nothing is written. Without the guard, the written file would split that request on reload. This is a new persistence risk introduced by in-place save (before it, a separator-in-body existed only in memory).

### Decision: Reuse the `SAVE_FILE` reducer action for the post-write state

On success the handler dispatches `{ type: 'SAVE_FILE', message, filePath: state.filePath }`. `SAVE_FILE` already sets `mode: 'normal'`, clears **every** request's `isDirty` marker (`requests.map(r => ({ ...r, isDirty: false }))`), sets the transient message, and clears save-input/error — and rebinding `filePath` to the same value is a no-op. Reusing it keeps the "any successful save clears the markers" contract (see the **unsaved-changes** spec) in one code path with no new action.

### Decision: No-op with feedback when no request is marked

When no request carries the `isDirty` marker, the handler writes nothing and displays a transient `No changes to save` message (auto-cleared via the existing transient-message mechanism). The handler early-returns via `hasUnsavedChanges(state.requests)` before any file I/O — the message needs no read — so an unmarked state never reaches the confirmation prompt.

### Decision: Confirm before overwriting the source file

In-place save is a destructive overwrite of the user's source file, so `Ctrl+S` on an http-format source with at least one marked request SHALL NOT write immediately. The handler first enters a new `'confirmInPlaceSave'` mode (mirroring the existing `'confirmDiscard'` pattern) and displays a prompt naming the file and the number of marked requests. `y` leaves the mode and performs the save (re-read, build, write, dispatch `SAVE_FILE`); `n` or `Escape` cancels without writing, leaving the markers set. The prompt reuses the established overlay styling (rounded `cyanBright` border, bold title, gray `y`/`n`/`Escape` hint) via a near-clone of `ConfirmDiscardOverlay`, consistent with the codebase's overlay-clone precedent (`SaveOverlay` cloned `FileLoadOverlay`).

The write is re-performed on `y` (re-read + re-build) rather than storing the built content in state — matching the confirm-discard flow, which re-performs the intercepted action on confirmation. Guard failures (structural mismatch, `###`-in-body) therefore surface as transient errors after confirmation rather than before; the prompt itself is skipped entirely when there is nothing to write (no marked requests) or when the source is not http-format.

**Alternatives considered:**
- Generalize the existing `confirmDiscard` mode and overlay into a generic confirmation mechanism (e.g. add `'saveInPlace'` to `PendingDiscardAction`) — rejected: muddies the discard semantics, forces a spec change to the well-specified confirm-discard flow, and couples two unrelated confirmations.
- Build the content before prompting and store it in state — rejected: needs a new `pendingInPlaceContent` field, diverges from the confirm-discard re-perform-on-confirm pattern, and the cached content could go stale if the file changes while the prompt is open.
- Write immediately without prompting — rejected: unlike save-as (which refuses on conflict), in-place save has no other guard against an accidental overwrite of the user's source file.

## Risks / Trade-offs

- **[Edited block normalization]** → The marked request's own comments (between separator and request line, or among headers), bare `###`, and header spacing are regenerated in canonical form. Mitigation: accepted by design (the user chose block replacement); comments in *unmarked* blocks and above separator-less first requests are preserved.
- **[`###`-in-body corruption]** → A written body containing a `^#{3,}` line would split the request on reload. Mitigation: hard refusal with a transient message before any write.
- **[External edits to an edited request's block clobbered]** → An external change to a request the user *also* edited is overwritten by the user's in-memory version (the marker selects that block). External changes to unmarked requests are preserved (no marker → not rewritten), and structural changes (request-count mismatch) are refused with a reload hint. Mitigation: `R` reload exists; no mtime check (out of scope).
- **[Reverted request rewritten]** → A request edited then reverted to its original body is still rewritten in canonical form because its tombstone marker stays set. Mitigation: consistent with the **per-request-unsaved-changes** contract; the body content is unchanged (only surrounding formatting normalizes), and the write clears the marker so `*` resolves.
- **[Declined confirmation leaves markers set]** → Cancelling the confirmation (`n`/`Escape`) performs no write, so every marker remains set and `*` stays visible. Mitigation: expected — the markers clear only on a completed save; the user can retry or discard via the existing `R`/`o`/`q` flow.
- **[Bare `###` normalization]** → `###` becomes `### Request N`. Cosmetic and parse-identical; the auto-name was already "Request N" in memory.
- **[Mixed line endings if detection is naive]** → Mitigation: EOL conversion of the regenerated block before splicing; split/join round-trips untouched regions exactly.
- **[`Request N` auto-naming drift]** → Deterministic (`requestCount`-based) and stable after save (the file now contains the explicit separator), so no numbering drift across repeated saves.

## Migration Plan

No migration: purely additive. No rollback concerns beyond reverting the change commit. The first in-place save of a file whose first request lacks a separator adds one `### Request N` line — a one-time, parse-identical normalization.

## Open Questions

- Whether edit-mode `Ctrl+S` should also persist in one step (commit + write) — explicitly deferred; the current design keeps commit-to-memory in the editor and save-to-disk in normal mode.
- Whether the request list should surface per-request dirty markers (`●`/`*` per row) — deferred; the tracker change declared UI changes out of scope, and this change only consumes the marker for save selection.
