## Context

The `REQUEST_ERROR` action serves two semantically distinct error sources: HTTP request failures (from `executeRequest`) and file reload failures (from `readFileSync`/`parseAnyFormat`). The `RequestError` type (`{message, code?}`) is a generic error envelope, not request-specific. Two `toRequestError` factories exist — `executor.ts` (with TLS hints) and `app.tsx` (without) — a duplication where the app.tsx version is missing TLS hint logic.

Today's reducer behavior for `REQUEST_ERROR`: `response: null`, `error: action.error`, `isLoading: false`, `responseScrollOffset: 0`, clear all search state. Both error sources share this reducer.

## Goals / Non-Goals

**Goals:**
- Split `REQUEST_ERROR` into `REQUEST_ERROR` (HTTP failures) and `RELOAD_ERROR` (file reload failures) for semantic clarity.
- Rename `RequestError` type → `ErrorInfo` to reflect its generic nature.
- Consolidate the two `toRequestError` factories into one exported `toErrorInfo`.
- Preserve all existing behavior (no UX change).

**Non-Goals:**
- Changing the reducer behavior for reload errors (wipes response + search — this is accepted behavior).
- Adding a new error display surface (reload errors stay in the response panel).
- Refactoring the error display architecture beyond the rename/split.
- Removing action-name references from specs (the current style uses parenthetical action names; changing that convention is scope creep).

## Decisions

### Decision 1: `RELOAD_ERROR` reducer mirrors `REQUEST_ERROR` exactly

The new `RELOAD_ERROR` action uses the same reducer body as `REQUEST_ERROR`:
```
response: null, error: action.error, isLoading: false,
responseScrollOffset: 0, ...CLEAR_SEARCH_STATE
```

**Rationale**: The user confirmed the current behavior (reload failure wipes response + search) is acceptable. The split is semantic — the action name reflects what happened, not a behavior change.

**Alternative considered**: `RELOAD_ERROR` with a milder reducer (preserve response, only set error). Rejected — user explicitly approved the current behavior.

### Decision 2: Type rename `RequestError` → `ErrorInfo`

The interface `{ message: string; code?: string }` is renamed to `ErrorInfo`. It is a generic error envelope used by:
- `REQUEST_ERROR` action payload
- `RELOAD_ERROR` action payload (new)
- `SET_FILE_LOAD_ERROR` / `SET_SAVE_ERROR` (`.message` field only)
- `executeRequest` return type union (`ResponseData | ErrorInfo`)
- `isRequestError` type guard (renamed to `isErrorInfo`)

**Rationale**: The type is not request-specific — it carries a message and optional code for any error. The name `RequestError` implies HTTP request semantics that don't apply to file reload/parse/save/load errors.

### Decision 3: Consolidate `toRequestError` into single exported `toErrorInfo`

The `executor.ts` version (with TLS hints via `getTlsHint`) is the superset. It will be renamed to `toErrorInfo` and exported. The `app.tsx` duplicate will be deleted and replaced with an import.

**Rationale**: The app.tsx version was missing TLS hint logic — a latent bug for the request-path catch block (line 142), where TLS errors caught outside `executeRequest` would lose their hints. File errors (lines 435, 588) won't trigger TLS hints because `getTlsHint` returns `undefined` for non-TLS error codes, so behavior is unchanged for those paths.

**Where to put `toErrorInfo`**: Keep in `executor.ts` and export it. It already houses `getTlsHint`, the TLS error code set, and the `isRequestError`/`isErrorInfo` guard. Moving to a separate `utils/errors.ts` is possible but adds a new file for minimal gain.

### Decision 4: Type guard rename `isRequestError` → `isErrorInfo`

The type guard `isRequestError(result: ResponseData | RequestError): result is RequestError` becomes `isErrorInfo(result: ResponseData | ErrorInfo): result is ErrorInfo`. It still checks `'message' in result`.

### Decision 5: `SET_FILE_LOAD_ERROR` and `SET_SAVE_ERROR` payloads stay as `string`

These actions take `error: string` (not `ErrorInfo`). They only use `toErrorInfo(error).message` at the dispatch site (app.tsx lines 199, 341). Changing them to take `ErrorInfo` is scope creep — the rename only affects the type they borrow `.message` from.

## Risks / Trade-offs

- **[Risk] Large rename surface** → `RequestError` appears in types, executor, app, components, and tests. Mitigated by using LSP rename and AST-grep for mechanical changes, then running diagnostics + tests.
- **[Risk] `toErrorInfo` now always adds TLS hints** → For file errors, `getTlsHint` returns `undefined` (no matching code), so the message is unchanged. Verified: TLS hint only triggers for codes in `TLS_ERROR_CODES` set.
- **[Trade-off] Two actions with identical reducers** → `REQUEST_ERROR` and `RELOAD_ERROR` have the same reducer body. This is intentional — the value is semantic clarity and future extensibility, not behavior divergence today.
