## Why

httptui tracks unsaved edits with a single file-level `isDirty` flag on `AppState`. That flag answers "has *anything* been edited since the last load/save" but cannot say *which* request was edited — information the app will need for per-request unsaved-change indicators and for a future in-place-save flow that rewrites only edited request blocks. This change introduces per-request dirty tracking as in-memory state, laying the groundwork without changing any UI.

## What Changes

- **`ParsedRequest` gains a required `isDirty: boolean` field.** Parsed requests start clean (`false`); the field is a tombstone meaning "edited in-session since the last load, reload, or save."
- **`COMMIT_EDIT` marks the edited request dirty** with monotonic (tombstone) semantics: once a request is dirty it stays dirty until the file is loaded, reloaded, or saved — even if the body is later reverted to its original value.
- **The global `isDirty` field is removed from `AppState`** and derived as `state.requests.some(r => r.isDirty)`. Observably identical behavior: the flag is monotonic within a session and clears on load/reload/save exactly as today.
- **`SAVE_FILE` clears all per-request markers** (it keeps the same `requests` array); `RELOAD_FILE` and `LOAD_FILE` replace the array with a fresh parse, so markers are clean by construction.
- **No UI changes.** The status-bar `*` prefix, the confirm-discard gates (`q`/`o`/`R`), and the request list render exactly as they do today.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `unsaved-changes`: the "Track unsaved changes at the file level" requirement changes from a single file-level flag to per-request dirty markers with a derived file-level flag. Set, clear, and revert semantics are preserved at the observable level.

## Impact

- **`src/core/types.ts`** — add `isDirty: boolean` to `ParsedRequest`; remove `isDirty` from `AppState`.
- **`src/core/parser.ts`**, **`src/core/postman-parser.ts`**, **`src/core/openapi-parser.ts`** — set `isDirty: false` on every parsed request.
- **`src/core/reducer.ts`** — `COMMIT_EDIT` (tombstone marker), `SAVE_FILE` (clear markers), `RELOAD_FILE`/`LOAD_FILE` (clean by construction), `createInitialState` (derived flag).
- **`src/app.tsx`** — replace `state.isDirty` reads (lines 466, 510, 573, 708) with the derived expression.
- **`src/components/StatusBar.tsx`** — unchanged (still receives a boolean prop).
- **Tests** — update `test/helpers` data factories (`createRequest`, `createInitialState`) and existing `unsaved-changes`/`request-editing` assertions for the derived flag; new unit tests for tombstone semantics and the revert edge case.
- **Future** — a later update to the `add-in-place-save` change will consume these markers (replace re-parse diffing). Out of scope here.
