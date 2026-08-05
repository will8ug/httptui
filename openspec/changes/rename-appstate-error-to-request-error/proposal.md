## Why

After `split-reload-error-action`, the `AppState.error` field is exclusively the HTTP request error — `RELOAD_ERROR` now flows to `transientError`. The generic name `error` no longer reflects what the field holds, and it is the only unqualified error field in `AppState`; its siblings are all source-qualified (`transientError`, `fileLoadError`, `saveError`, `envSelectError`).

## What Changes

- **Rename** the `AppState.error: ErrorInfo | null` field to `requestError` — matching the `REQUEST_ERROR` action that feeds it and the `*Error` naming convention of its sibling state fields.
- Update all read/write sites: the reducer cases that set or clear it (`SEND_REQUEST`, `RECEIVE_RESPONSE`, `REQUEST_ERROR`, `RELOAD_FILE`, `LOAD_FILE`, `SWITCH_ENV`, `createInitialState`), the single consumption site in `app.tsx` (passed to `ResponseView`), and test literals/assertions.
- **No behavioral change.** The field's semantics, reducer behavior, and rendering are identical; this is a pure rename.
- **Not renamed:** the `ResponseView` `error` prop (component's public interface, consistent with `FileLoadOverlay`/`SaveOverlay`/`EnvSelectOverlay` which also take a generic `error` prop from qualified state fields), the `error` payload field of `REQUEST_ERROR`/`RELOAD_ERROR` actions, or any action names.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tui`: The File Reload section names the state field `` `error` `` as being cleared by reload ("Reload clears `response`, `error`, and `responseScrollOffset`") and references "error state" in the reload-error requirement. Both references update to the renamed field.

## Impact

- **Code**: `src/core/types.ts` (field declaration), `src/core/reducer.ts` (7 write sites), `src/app.tsx` (1 read site).
- **Tests**: `test/core/file-load-operations.test.ts` (2 literals, 2 assertions), `test/core/env-switcher.test.ts` (1 literal, 1 assertion), `test/core/reload-error.test.ts` (1 assertion). Look-alike `error` references in action payloads, local variables, and `ResponseView` props are untouched.
- **Specs**: `tui/spec.md` delta (field-name references only).
- **No behavior change**; no dependency or API changes.
