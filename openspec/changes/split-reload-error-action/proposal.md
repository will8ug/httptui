## Why

The `REQUEST_ERROR` action is overloaded: it handles both HTTP request failures (genuine request errors) and file reload failures (`readFileSync`/`parseAnyFormat` errors). The `RequestError` type and `toRequestError` factory are similarly misnamed — they are generic error envelopes (`{message, code?}`), not request-specific. This naming tangle obscures intent and hides a duplicated `toRequestError` factory (app.tsx lacks TLS hints that executor.ts provides).

## What Changes

- **New `RELOAD_ERROR` action** for file reload failures (app.tsx lines 435, 588). The reducer sets a transient error message in the status bar (red, auto-clears after ~2s) — it does NOT clear the response, error state, or search. Reload failures no longer destroy valid response/search data.
- **`REQUEST_ERROR` retained** for HTTP request failures only (app.tsx lines 136, 142). Its reducer behavior (clear response, set error, clear search) is unchanged.
- **New `transientError` state field** (`string | null`): displayed in red in the status bar, auto-cleared by the existing `scheduleTransientClear` mechanism. `SET_TRANSIENT_MESSAGE` reducer also clears `transientError`; `RELOAD_ERROR` clears `transientMessage`. The two are mutually exclusive.
- **Type rename**: `RequestError` → `ErrorInfo`. The type is `{message: string; code?: string}` — a generic error envelope, not request-specific. Used by `REQUEST_ERROR` and `RELOAD_ERROR` action payloads, plus `SET_FILE_LOAD_ERROR`/`SET_SAVE_ERROR` (`.message` only).
- **Factory consolidation**: merge the two `toRequestError` functions (executor.ts with TLS hints, app.tsx without) into one exported `toErrorInfo`. File errors won't trigger TLS hints (no matching codes), so behavior is unchanged.

## Capabilities

### New Capabilities

None. Reload error behavior already exists; this change splits the action, renames types, and moves the error display from the response panel to the status bar.

### Modified Capabilities

- `tui`: reload handler references `REQUEST_ERROR` for file reload failures; must reference `RELOAD_ERROR` instead, and the error display moves from the response panel to a transient status-bar message.
- `status-bar`: a new transient error message field (`transientError`) SHALL be displayed in red alongside the existing green transient success message. `SET_TRANSIENT_MESSAGE` SHALL also clear `transientError`.

## Impact

- **Code**: `src/core/types.ts` (type rename, new action, new state field), `src/core/reducer.ts` (new `RELOAD_ERROR` case, `SET_TRANSIENT_MESSAGE` clears `transientError`), `src/core/executor.ts` (export `toErrorInfo`, rename `isRequestError`), `src/app.tsx` (2 dispatch sites, import, `scheduleTransientClear` calls), `src/components/StatusBar.tsx` (render `transientError` in red, new prop), `src/components/ResponseView.tsx` (type import).
- **Specs**: `tui/spec.md`, `status-bar/spec.md`.
- **Tests**: `test/core/search.test.ts` (REQUEST_ERROR test stays; no RELOAD_ERROR search test needed since it doesn't clear search), `test/components/StatusBar.test.tsx` (add transientError test), any tests referencing `RequestError`/`toRequestError`/`isRequestError`.
- **Behavioral change**: reload failures no longer clear the response or search state. They show as a red transient message in the status bar instead.
