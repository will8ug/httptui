## Context

httptui is a single-reducer Ink app. `AppState` carries a single file-level `isDirty: boolean` that answers "has *anything* been edited since the last load/reload/save" but cannot say *which* request was edited. `ParsedRequest` (in `src/core/types.ts`) is a plain data object with no id field and no per-request status; the only in-session mutation is `COMMIT_EDIT`, which replaces one request's `body` in place (array length and order unchanged). `RELOAD_FILE` and `LOAD_FILE` replace the entire `requests` array with a fresh parse; `SAVE_FILE` keeps the same array and only clears the flag.

Future work needs per-request granularity: a per-request unsaved-changes indicator in the request list (UI, not this change) and an in-place-save flow that rewrites only edited request blocks. Today the app derives "which requests were edited" at save time by re-parsing the source and diffing bodies; per-request markers stored on the requests make that derivation unnecessary and give UI consumers direct access to per-request state.

## Goals / Non-Goals

**Goals:**
- Each in-memory `ParsedRequest` carries a per-request unsaved-changes marker.
- The marker is set when a committed edit changes that request's stored value; it is never un-set by further edits (tombstone semantics).
- The file-level flag is *derived* from the markers (`requests.some(r => r.isDirty)`), so there is a single source of truth.
- Observable behavior is unchanged: status-bar `*`, the `q`/`o`/`R` confirm-discard gates, and save/load/reload clearing behave exactly as today.
- The marker lives only in memory — no persistence, no UI changes.

**Non-Goals:**
- Any UI change (request-list markers, status-bar changes).
- Live-diff semantics ("differs from disk right now") — that remains the in-place-save re-parse flow's job at save time.
- Consuming the markers in `add-in-place-save` — deferred to a later update of that change.
- Editing anything other than bodies (name/method/url/headers stay read-only).

## Decisions

### Decision: Marker is a required field on `ParsedRequest`

`ParsedRequest` gains `isDirty: boolean`, set to `false` at every parse site (`parser.ts`, `postman-parser.ts`, `openapi-parser.ts`) and in the `test/helpers` request factory. The field is **required**, not optional: the compiler then enforces completeness at every creation site, and "fresh from disk = clean" is encoded in the type rather than implied by `undefined`.

**Alternatives considered:**
- Optional `isDirty?: boolean` — rejected: leaves a tri-state (true/false/undefined) and silently drops coverage of new parse sites.
- Parallel `Set`/`Record` in `AppState` keyed by name or index — rejected: `name` is not guaranteed unique and `lineNumber` shifts on save/reload; a parallel structure must be maintained in lockstep with the array in every mutating case, creating two sources of truth for the same fact.

### Decision: Tombstone semantics — set on edit, never un-set by further edits

In `COMMIT_EDIT`, the edited request's marker becomes `req.isDirty || changed` (monotonic). Once set, a request's marker stays set until the file is loaded, reloaded, or saved. Reverting a request's body to its original value does **not** clear the marker.

This is exactly the behavior of today's monotonic global flag (`state.isDirty || changed`), so the derived file-level flag is observably identical — zero regression on the status bar and confirm-discard gates. True "differs from disk" semantics would require the reducer to know the disk version of each body, which it does not; the in-place-save flow already computes that at save time by re-parsing. Tombstone semantics and re-parse diffing answer different questions ("has unsaved edits" vs "differs from disk now") and coexist cleanly.

**Alternatives considered:**
- Live-diff (`isDirty: changed`, clears when reverted) — rejected: the reducer's `changed` compares against the *current in-memory* body, not the disk body, so it cannot detect "reverted to the original" without a per-request snapshot of the parse — machinery that duplicates the in-place-save re-parse and drifts if the file changes on disk.

### Decision: Global `isDirty` is removed from `AppState` and derived

`AppState.isDirty` is deleted. Every read site (`app.tsx` lines 466, 510, 573, 708) computes `state.requests.some(r => r.isDirty)` via a small exported helper `hasUnsavedChanges(requests: ParsedRequest[]): boolean` in `src/core/types.ts`, so the derivation lives in one place and cannot drift across the four call sites. `StatusBar` keeps its boolean prop — the component itself is untouched.

Deriving from the array is always consistent with the markers, eliminates the "two flags could disagree" hazard, and makes the file-level flag strictly more accurate than today's global (it can un-set a request that was reverted — though the tombstone decision above means a *request* marker never un-sets; the derivation is a projection, not a second decision).

**Alternatives considered:**
- Keep `AppState.isDirty` and update it in lockstep with the markers — rejected: two sources of truth for one fact; every mutating case must remember to update both.

### Decision: Clean flows need no new mechanism

- `RELOAD_FILE` / `LOAD_FILE` replace the array with a fresh parse whose requests carry `isDirty: false` — markers clear by construction; the explicit `isDirty: false` in those cases is simply deleted.
- `SAVE_FILE` keeps the same array, so it maps over `state.requests` clearing every marker (`{ ...r, isDirty: false }`), replacing the current single-flag clear.
- `createInitialState` seeds from parsed props (all clean); its `isDirty: false` line is deleted.
- `SEND_REQUEST` / `RECEIVE_RESPONSE` / `REQUEST_ERROR` do not touch markers — sending never marks a request dirty, preserving today's invariant.

### Decision: The revert edge case is documented, not special-cased

A request edited then reverted to its original body remains marked dirty (tombstone). This is the direct consequence of the tombstone decision and matches today's observable behavior. It is captured as an explicit scenario in the delta spec so the behavior is contractual rather than accidental.

## Risks / Trade-offs

- **[Two sources of truth re-introduced]** → The `AppState.isDirty` field is deleted; TypeScript prevents re-adding reads. The `hasUnsavedChanges` helper is the single derivation point.
- **[Parsers forget the new field]** → Required field: the type checker fails any parse site that omits it. The three parsers and the test factory are the only creation sites.
- **[Tombstone over-reports cleanliness]** → A request reverted to its original body still counts as dirty. Accepted: identical to today's behavior, requires no disk snapshot, and the future in-place-save flow re-verifies against disk at save time anyway.
- **[Future consumers depend on marker semantics]** → The delta spec pins set/clear/revert behavior; `add-in-place-save` and any UI change later build on a documented contract.

## Migration Plan

No persistence, so no data migration. Purely additive field + removal of a derived field. Rollback is reverting the change commit; nothing on disk or in saved state is affected.

## Open Questions

- Whether the confirm-discard gates (`q`/`o`/`R`) should eventually become per-request ("only warn if the *selected* request is dirty") — deferred; this change keeps them file-level and observably identical.
- Whether `add-in-place-save` will consume the markers or keep re-parse diffing — deferred to that change's later update.
