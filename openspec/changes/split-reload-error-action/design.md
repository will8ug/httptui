## Context

The `REQUEST_ERROR` action serves two semantically distinct error sources: HTTP request failures (from `executeRequest`) and file reload failures (from `readFileSync`/`parseAnyFormat`). The `RequestError` type (`{message, code?}`) is a generic error envelope, not request-specific. Two `toRequestError` factories exist — `executor.ts` (with TLS hints) and `app.tsx` (without) — a duplication where the app.tsx version is missing TLS hint logic.

Today's `REQUEST_ERROR` reducer: `response: null`, `error: action.error`, `isLoading: false`, `responseScrollOffset: 0`, clear all search state. Both error sources share this reducer, meaning a failed reload wipes the current response and search results.

The status bar already has a `transientMessage` field (green, bold, auto-clears after ~2s via `scheduleTransientClear`) used for success messages like "Reloaded" and "Loaded: {name}".

## Goals / Non-Goals

**Goals:**
- Split `REQUEST_ERROR` into `REQUEST_ERROR` (HTTP failures) and `RELOAD_ERROR` (file reload failures) for semantic clarity.
- `RELOAD_ERROR` displays as a transient error message in the status bar (red), not in the response panel. It does NOT clear response, error, or search state.
- Rename `RequestError` type → `ErrorInfo` to reflect its generic nature.
- Consolidate the two `toRequestError` factories into one exported `toErrorInfo`.
- Preserve all existing behavior for `REQUEST_ERROR` (HTTP failures).

**Non-Goals:**
- Changing the `REQUEST_ERROR` reducer (still clears response + search for HTTP errors).
- Changing the transient success message mechanism (green `transientMessage` stays as-is).
- Refactoring the error display architecture beyond the split/rename.
- Removing action-name references from specs (the current style uses parenthetical action names; changing that convention is scope creep).

## Decisions

### Decision 1: `RELOAD_ERROR` reducer sets transient error, not response/error/search

The new `RELOAD_ERROR` action's reducer:
```
transientMessage: null,
transientError: action.error.message,
```

It does NOT touch `response`, `error`, `isLoading`, `responseScrollOffset`, or search state. The handler calls `scheduleTransientClear()` to auto-clear the transient error after ~2 seconds.

**Rationale**: A failed file reload doesn't invalidate the current response or search results. Showing the error as a transient status-bar message is less destructive and matches the existing success-message pattern ("Reloaded" → green transient, reload failure → red transient).

**Alternative considered**: `RELOAD_ERROR` with the same reducer as `REQUEST_ERROR` (clears response + search). Rejected — the user directed that reload errors should be transient messages, not response-panel errors.

### Decision 2: New `transientError` state field (red, mutually exclusive with `transientMessage`)

Add `transientError: string | null` to app state. The StatusBar renders it in red bold, similar to `transientMessage` in green bold. The two fields are mutually exclusive:
- `RELOAD_ERROR` sets `transientError` and clears `transientMessage`.
- `SET_TRANSIENT_MESSAGE` sets `transientMessage` and clears `transientError`. This means `scheduleTransientClear()` (which dispatches `SET_TRANSIENT_MESSAGE` with `null`) clears both fields after 2 seconds.

**Rationale**: Reusing the existing `transientMessage` field would show errors in green — incorrect for error messages. A separate field with red rendering is a minimal addition (one state field, one StatusBar render line, one reducer line) and gives correct UX. Making the fields mutually exclusive avoids conflicting messages.

**Alternative considered**: Add a `color` attribute to `transientMessage` (e.g., `{text, color}`). Rejected — changes the type of an existing field, touching more code for minimal gain.

### Decision 3: Type rename `RequestError` → `ErrorInfo`

The interface `{ message: string; code?: string }` is renamed to `ErrorInfo`. It is a generic error envelope used by:
- `REQUEST_ERROR` action payload
- `RELOAD_ERROR` action payload (new)
- `SET_FILE_LOAD_ERROR` / `SET_SAVE_ERROR` (`.message` field only)
- `executeRequest` return type union (`ResponseData | ErrorInfo`)
- `isRequestError` type guard (renamed to `isErrorInfo`)

**Rationale**: The type is not request-specific — it carries a message and optional code for any error. The name `RequestError` implies HTTP request semantics that don't apply to file reload/parse/save/load errors.

### Decision 4: Consolidate `toRequestError` into single exported `toErrorInfo`

The `executor.ts` version (with TLS hints via `getTlsHint`) is the superset. It will be renamed to `toErrorInfo` and exported. The `app.tsx` duplicate will be deleted and replaced with an import.

**Rationale**: The app.tsx version was missing TLS hint logic — a latent bug for the request-path catch block (line 142), where TLS errors caught outside `executeRequest` would lose their hints. File errors (lines 435, 588) won't trigger TLS hints because `getTlsHint` returns `undefined` for non-TLS error codes, so behavior is unchanged for those paths.

**Where to put `toErrorInfo`**: Keep in `executor.ts` and export it. It already houses `getTlsHint`, the TLS error code set, and the `isRequestError`/`isErrorInfo` guard.

### Decision 5: Type guard rename `isRequestError` → `isErrorInfo`

The type guard `isRequestError(result: ResponseData | RequestError): result is RequestError` becomes `isErrorInfo(result: ResponseData | ErrorInfo): result is ErrorInfo`. It still checks `'message' in result`.

### Decision 6: `SET_FILE_LOAD_ERROR` and `SET_SAVE_ERROR` payloads stay as `string`

These actions take `error: string` (not `ErrorInfo`). They only use `toErrorInfo(error).message` at the dispatch site (app.tsx lines 199, 341). Changing them to take `ErrorInfo` is scope creep — the rename only affects the type they borrow `.message` from.

## Risks / Trade-offs

- **[Risk] Large rename surface** → `RequestError` appears in types, executor, app, components, and tests. Mitigated by using LSP rename and AST-grep for mechanical changes, then running diagnostics + tests.
- **[Risk] `toErrorInfo` now always adds TLS hints** → For file errors, `getTlsHint` returns `undefined` (no matching code), so the message is unchanged. Verified: TLS hint only triggers for codes in `TLS_ERROR_CODES` set.
- **[Trade-off] Reload errors are transient** → If the user misses the 2-second window, the error message is gone. This matches the existing "Reloaded" success message pattern. If persistent errors are needed later, that's a separate change.
- **[Behavioral change] Reload failures no longer clear response/search** → Previously, a failed reload wiped the current response and search results. After this change, they are preserved, and the error shows briefly in the status bar. This is the intended improvement.
