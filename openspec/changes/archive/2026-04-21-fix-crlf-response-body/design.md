# Design: Fix CRLF-mangled response body rendering

## Context

httptui renders HTTP responses in a TUI. When a response body contains `\r\n` line endings:

1. `src/core/executor.ts:113` captures the body raw via `await response.body.text()` with no normalization.
2. The body is stored in `ResponseData.body` and threaded through `formatResponseBody()`.
3. Seven downstream sites split on `\n` only — never `\r?\n`:
   - `src/core/responseLayout.ts:121` (render)
   - `src/core/reducer.ts:58, 79, 500` (search indexing, scroll math)
   - `src/app.tsx:26`
   - `src/utils/scroll.ts:37`
   - `src/utils/colors.ts:68` (JSON-only path; safe in practice)
4. Each resulting line keeps a trailing `\r`. When Ink flushes `<Text>{"  body {\r"}</Text>` to the terminal, `\r` moves the cursor to column 0, and the next line overwrites it. Result: vertical stacking / duplication (documented in `assets/crlf-messy-bug.png`).

The bug is invisible for JSON responses because `formatResponseBody` → `JSON.parse` → `JSON.stringify(..., 2)` re-serializes with LF only. HTML, XML, and plain-text responses bypass that sanitization and break.

A related pattern already exists: `src/core/parser.ts:154` normalizes the `.http` *input file* with `content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')`. The fix should mirror it.

## Goals / Non-Goals

**Goals:**
- Response bodies render correctly regardless of server line-ending convention.
- Single point of change — no risk of search-index / render-index drift.
- Preserve the existing `ResponseData` shape so no caller is disturbed.
- Match the codebase's existing CRLF-normalization convention (`parser.ts:154`).

**Non-Goals:**
- Preserving byte-exact fidelity to the server response. httptui is a renderer, not a raw-bytes inspector.
- Normalizing headers. HTTP headers are `\r\n`-terminated on the wire, but `undici` already parses them into a JS object — there is no CRLF leakage through the header path.
- HTML tag handling, entity decoding, or sanitization. Out of scope for this bug.
- Adding a separate `rawBody` field. YAGNI until a concrete "show raw response" feature lands.
- Rewriting the 7 downstream `split('\n')` sites. They become correct automatically once the source is normalized.

## Decisions

### Decision 1: Normalize at ingestion (executor.ts), not at each splitter

**Chosen:** Apply `body.replace(/\r\n/g, '\n').replace(/\r/g, '\n')` once in `executor.ts`, immediately after `await response.body.text()`, before returning `ResponseData`.

**Alternatives considered:**

| Option | Pros | Cons |
|---|---|---|
| **A. Normalize once in executor (chosen)** | 1 line changed. All 7 downstream splitters become correct. No risk of search/render index drift. Matches `parser.ts:154` convention. | Loses byte-exact fidelity to original body. |
| B. Switch every `split('\n')` to `split(/\r?\n/)` | Preserves original bytes. | 7 sites to change. Easy to miss one. If `reducer.ts` (search index) and `responseLayout.ts` (render) ever disagree, `/search` jumps to wrong line — a silent correctness bug. |
| C. Normalize in `formatResponseBody` | Closer to render path. | `formatResponseBody` runs every render cycle; normalization would run repeatedly on the same string. Also misses consumers that read `response.body` directly (the reducer does, at line 58/79 for search indexing). |
| D. Preserve `rawBody` alongside normalized `body` | Future-proof for a "raw HTTP" feature. | YAGNI. Adds a field no one reads. Can be added later when such a feature has concrete requirements. |

**Rationale:** Fixing at the source is the least risky option. The alternative (defensive splitting everywhere) creates a multi-site invariant where a future contributor who adds an 8th splitter can silently reintroduce the bug. Byte-exact fidelity is not required because httptui is a renderer; no current feature relies on original line endings.

### Decision 2: Normalize both CRLF and lone CR

**Chosen:** Two-pass normalization identical to `parser.ts:154`: `.replace(/\r\n/g, '\n').replace(/\r/g, '\n')`.

**Alternatives considered:**

| Option | Pros | Cons |
|---|---|---|
| **A. Two-pass (CRLF then lone CR)** | Handles every combination including mixed / pathological streams. Consistent with `parser.ts`. | Slightly more work per response. Negligible. |
| B. Single-pass `split(/\r\n?|\r?\n/).join('\n')` | One regex. | Harder to read. Edge cases around ordering. |
| C. Only handle `\r\n` (skip lone `\r`) | Simpler. | Lone `\r` (classic Mac convention, or truncated streams) still mangles the terminal. |

**Rationale:** Terminal rendering is broken by *any* `\r` in the stream, not just CRLF. The two-pass form is the proven idiom already used in `parser.ts` — zero cognitive cost for a reader who's seen the other site.

### Decision 3: Do not normalize inside `formatResponseBody` or downstream consumers

Keep `formatter.ts`, `responseLayout.ts`, `reducer.ts`, `scroll.ts`, `app.tsx`, and `RequestDetailsView.tsx` untouched. They all rely on the invariant "`ResponseData.body` is LF-only", which becomes true after this change. Duplicating normalization anywhere downstream would be dead code.

Exception: `colors.ts:68` splits JSON on `\n`. JSON arrives pre-normalized from `JSON.stringify` and is therefore safe. Optional follow-up: add a comment there documenting the invariant. Not in scope for this change.

## Risks / Trade-offs

- **[Lost byte fidelity]** A user will never see the original `\r\n` bytes in `ResponseData.body`. → Mitigation: acceptable because httptui is a renderer, not a debugging proxy. If a "raw HTTP inspector" feature is ever added, it can capture the unnormalized bytes before this normalization step and store them in a new field.

- **[Binary response corruption]** If a response is binary (e.g. an image accidentally fetched as text), normalization will corrupt any `\r` bytes in the payload. → Mitigation: `response.body.text()` is already a lossy UTF-8 decode; binary integrity is already gone. This change does not make the situation meaningfully worse, and httptui displays bodies as text anyway.

- **[Performance]** Two full-string passes per response. → Mitigation: response bodies are typically ≤ a few MB; the passes are O(n) and run once per request (not per render). Negligible relative to network RTT.

- **[Test drift]** Existing tests that hard-code `\r\n` in mocked response bodies (if any) would need updating. → Mitigation: grep shows no such tests today; the smoke test and integration tests use LF-only bodies.

## Migration Plan

No migration required — this is a bug fix with no user-visible API change. Deploy is a simple version bump; rollback is reverting one commit.
