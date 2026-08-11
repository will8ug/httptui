## Context

The in-session editor (`e` key) opens an overlay with one text buffer per tab, seeded by `app.tsx`, edited through `EDIT_KEY`, committed by `COMMIT_EDIT` in `src/core/reducer.ts`. It currently has two targets, `url` and `body` (`EditTarget` in `src/core/types.ts:105`). Request headers are stored as `Record<string, string>` on `ParsedRequest`, parsed from `.http` by `parser.addHeader` (first-colon split, trim, case-insensitive duplicate → last wins with the latest casing), serialized back by `http-serializer.serializeRequestBlock` as `${name}: ${value}` lines, and sent by `executor.ts` which clones `resolvedRequest.headers`. `resolveVariables` walks header values and substitutes `{{var}}` automatically, and `request-details` renders them from the same record — so once committed, header edits propagate everywhere with no downstream changes. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Add a `headers` edit target as a free-form text buffer (one `Name: Value` per line) reusing the existing editor machinery with zero structural change to `EditOverlay`.
- Round-trip the `Record<string, string>` ↔ text conversion faithfully, mirroring `parser.addHeader` semantics exactly.
- Reject commits with malformed header lines, keeping the overlay open and the user's buffers intact.
- Fold header changes into the existing `changed`/`isDirty` logic so in-place save and save-as pick them up.

**Non-Goals:**
- No structured key/value row editor, no per-field focus model.
- No changes to header *sending* (executor), *resolution* (variables), or *rendering* (request-details) — all consume the same record and work unchanged.
- No duplicate-header support: the data model is a `Record`, so two headers with the same case-insensitive name cannot coexist (matching the parser's own limitation).
- No header validation beyond the colon presence and non-empty key rules in the spec (no HTTP header-name grammar checks).

## Decisions

### D1: Free-form text buffer, not a structured editor

The headers tab is a plain string buffer: each line is one header, seeded as `Object.entries(headers).map(([k, v]) => \`${k}: ${v}\`).join('\n')`. `EditOverlay` already renders whatever `buffer` it is given and is target-agnostic; the tab strip, cursor, scrolling, and hint line all work unchanged. `Enter` inserts a newline (new header line), exactly like the body tab.

- **Alternatives considered**: a structured key/value row editor with separate key and value cells. Rejected: it needs new cursor/focus/row-navigation machinery, contradicts the "simplified editor" philosophy, and the free-form format already round-trips cleanly with the `.http` format.
- **Consequence**: `EditTarget` widens to `'body' | 'headers' | 'url'`; `editBuffers` stays `Record<EditTarget, { text, cursor }>` — uniform across all tabs.

### D2: New pure helpers `headersToText` / `parseHeadersText` in `src/core/headers.ts`

No header↔text conversion exists anywhere today; `addHeader` is an internal parser detail. Create `src/core/headers.ts` (mirrored by `test/core/headers.test.ts`, matching the existing `test/core` ↔ `src/core` layout):

- `headersToText(headers): string` — `Name: Value` lines in record insertion order.
- `parseHeadersText(text): { ok: true; headers } | { ok: false; error; line }` — per non-blank line: split on the **first** `:`, trim key and value; empty key is an error; case-insensitive duplicate → the later line wins with its casing (mirroring `addHeader` exactly, including its delete-old-key-then-write-new behavior); blank lines are skipped. Returns the 1-based line number with the error for the message.

Round-trip property: `parseHeadersText(headersToText(h))` equals `h` (order-insensitive) when `h` has no case-colliding keys.

- **Alternatives considered**: embedding the parse in `COMMIT_EDIT`. Rejected: the reducer is already large, and the pure function is directly unit-testable.

### D3: Malformed line rejects the commit via `transientError`, staying in edit mode

`COMMIT_EDIT` currently always exits to normal mode. New behavior: parse the headers buffer first; on failure, return state with `mode` still `'edit'`, buffers untouched, and `transientError` set to a message naming the offending line (e.g. `Cannot save: header line 3 is missing a ":"`). `transientError` is an existing state field rendered red by `StatusBar` and auto-cleared by the existing mechanism — same pattern as reload errors (`reducer.ts:144-145`). Only when parsing succeeds does commit proceed.

- **Rationale**: per user decision — no silent data loss; a malformed line must be fixed, and keeping the overlay open preserves all in-progress buffers.

### D4: Single source of truth for tab order — headers appended last

Define `EDIT_TAB_ORDER: readonly EditTarget[] = ['url', 'body', 'headers']` (in `src/core/types.ts` next to `EditTarget`). Both consumers use it:
- `app.tsx` `Shift+Tab` handler — currently hardcoded `url ? 'body' : 'url'` (`app.tsx:400`) — becomes `EDIT_TAB_ORDER[(index + 1) % length]`.
- `app.tsx` overlay render — `tabs={EDIT_TAB_ORDER}` instead of the literal `['url', 'body']` (`app.tsx:756`).

Headers is **appended** (url → body → headers) rather than inserted between url and body. The `.http` format puts headers before the body, but the editor's existing tab order is url → body, and the archived scenario "Shift+Tab switches from the URL tab to the body tab" must stay literally true — the spec validator refuses to drop or rename existing scenarios. Appending preserves that scenario verbatim; the only original scenario whose content must change is the generic "wraps from the last tab to the first", which now wraps body → headers → url. This also matches the user framing of "add one another tab".

### D5: Commit writes headers and detects change order-insensitively

`COMMIT_EDIT` (`reducer.ts:747-770`) gains:
- `nextHeaders = parseOk ? parsed.headers : undefined`; empty buffer parses to `{}` (headers stay an object, unlike body's `undefined`).
- `changed = nextUrl !== request.url || nextBody !== request.body || !headersEqual(nextHeaders, request.headers)` where `headersEqual` compares key sets and values **ignoring order**.
- The `.map` update becomes `{ ...req, headers: nextHeaders, url: nextUrl, body: nextBody, isDirty: req.isDirty || changed }`.

Order-insensitive equality means reordering header lines without changing any name or value is *not* a change: no transient `Request updated`, no dirty marker. The request is semantically identical.

- **Alternatives considered**: `JSON.stringify` comparison. Rejected — stringify is order-sensitive, so a pure line reorder would spuriously mark the request dirty.

### D6: Tab-switch guard and reset sites

- `SWITCH_EDIT_TAB` keeps its form-data guard (`reducer.ts:729-734`) — it only refuses the `body` target; the headers tab opens freely on any request, including form-data ones.
- The three `editBuffers` reset sites (`COMMIT_EDIT` success at `reducer.ts:763-764`, `CANCEL_EDIT` at `:776-777`, initial state at `:868-869`) each gain a `headers: { text: '', cursor: 0 }` entry.
- `ENTER_EDIT` (`reducer.ts:680-697`) seeds the headers buffer from `action.buffers.headers` alongside url/body; `app.tsx:585` populates it via `headersToText(selectedRequest.headers)`.

### D7: `###` block-separator guard in in-place-save (defensive parity)

`in-place-save.ts` already refuses saves when a body line starts with `###` (`bodyContainsSeparator`, `:28-30`, checked at `:108-109`). For headers the risk is largely theoretical — serialized header lines always begin with a trimmed, non-empty name, so only a header *named* `###`-like text (`###: value`) could collide with the `### ` block separator. Add an equivalent `headersContainSeparator` check for parity; it costs a few lines and prevents a class of file-corruption on save.

### D8: No executor / variables / request-details changes

Because headers flow as one `Record<string, string>` through the whole pipeline, committing edited headers automatically affects sending (`executor.ts:106` clones `resolvedRequest.headers`), variable resolution (`variables.ts` walks header values), details rendering, save-as, and in-place save. This is the payoff of D1's "reuse everything" choice.

## Risks / Trade-offs

- [Case-insensitive duplicate collapse is silent] → Mirrors `parser.addHeader` exactly (spec'd "later line wins"); a user typing `content-type` when `Content-Type` exists gets the same result the parser would produce on reload, so no new surprise.
- [Commit-reject path is new behavior on an existing action] → Additive: reject only fires when a malformed header line exists; all existing `COMMIT_EDIT` scenarios (no headers edits) behave identically. Existing tests in `test/core/request-editing.test.ts` remain valid.
- [A header value containing `{{var}}` shows raw in the editor] → By design (spec'd raw-text requirement); resolution happens at send time via the existing `resolveVariables` walk, so no work needed.
- [Empty-key line (`: value`) is an error] → Per D2, an empty trimmed key is malformed; the message names the line so the user can fix it.
- [Header values with newlines are impossible through the editor] → Each line is one header, so a pasted newline starts a new line and becomes a new (or malformed) header. Consistent with the `.http` line-based format.

## Migration Plan

No migration: purely additive editor capability. Rollback is trivial — revert the change; committed headers simply stop being editable and stored headers remain in place. The `###` guard is the only defensive behavior touching save paths, and it only *refuses* saves it would otherwise have corrupted.
