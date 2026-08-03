## Why

The `REQUEST_ERROR` action is overloaded: it handles both HTTP request failures (genuine request errors) and file reload failures (`readFileSync`/`parseAnyFormat` errors). The `RequestError` type and `toRequestError` factory are similarly misnamed — they are generic error envelopes (`{message, code?}`), not request-specific. This naming tangle obscures intent and hides a duplicated `toRequestError` factory (app.tsx lacks TLS hints that executor.ts provides).

## What Changes

- **New `RELOAD_ERROR` action** for file reload failures (app.tsx lines 435, 588). Same reducer behavior as `REQUEST_ERROR` (clears response, sets error, clears search) — the split is semantic, not behavioral.
- **`REQUEST_ERROR` retained** for HTTP request failures only (app.tsx lines 136, 142).
- **Type rename**: `RequestError` → `ErrorInfo`. The type is `{message: string; code?: string}` — a generic error envelope, not request-specific. Used by both `REQUEST_ERROR` and `RELOAD_ERROR` actions, plus `SET_FILE_LOAD_ERROR`/`SET_SAVE_ERROR` (`.message` only).
- **Factory consolidation**: merge the two `toRequestError` functions (executor.ts with TLS hints, app.tsx without) into one exported `toErrorInfo`. File errors won't trigger TLS hints (no matching codes), so behavior is unchanged.

## Capabilities

### New Capabilities

None. Reload error behavior already exists; this change splits the action and renames types for clarity.

### Modified Capabilities

- `response-search`: search state clearing requirement references `REQUEST_ERROR`; must also cover `RELOAD_ERROR` since the new action clears search identically.
- `tui`: reload handler documentation references `REQUEST_ERROR` for file reload failures; must reference `RELOAD_ERROR` instead.

## Impact

- **Code**: `src/core/types.ts` (type rename + new action), `src/core/reducer.ts` (new case), `src/core/executor.ts` (export `toErrorInfo`, `isRequestError` return type), `src/app.tsx` (2 dispatch sites + import), `src/components/ResponseView.tsx` (type import).
- **Specs**: `response-search/spec.md`, `tui/spec.md`.
- **Tests**: `test/core/search.test.ts` (REQUEST_ERROR test), any tests referencing `RequestError` type or `toRequestError`.
- **No behavioral change**: reducer behavior for reload errors is identical before and after. The split is purely semantic.
