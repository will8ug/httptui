## Why

Pressing `Ctrl+S` in the body editor always shows "Body updated" in the status bar, even when the buffer was never changed. The message claims an update that did not happen — misleading feedback for a no-op commit. The reducer already detects the no-op correctly for `isDirty` (via `nextBody !== request.body`), so gating the message on the same condition is a small, consistent fix.

## What Changes

- `COMMIT_EDIT` in `src/core/reducer.ts` sets `transientMessage: 'Body updated'` **only when** the committed buffer actually differs from the request's current body.
- A no-op commit (buffer identical to the stored body, including the empty-buffer → `undefined` normalization) closes the overlay and returns to normal mode **without** displaying a transient message.
- All other commit behavior is unchanged: overlay closes, buffer/cursor/scroll state resets, `isDirty` update semantics stay as-is.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `request-editing`: The "Commit the edit with Ctrl+S" requirement currently mandates a transient confirmation on every commit. It changes to require the confirmation only when the committed value differs from the stored body; a no-op commit shows no confirmation.

## Impact

- `src/core/reducer.ts` — `COMMIT_EDIT` case (message gating).
- `test/core/request-editing.test.ts` — existing tests survive (they commit real changes); add a no-op commit test asserting `transientMessage` stays `null`.
- `test/integration/request-body-editing.test.tsx` — existing assertions survive; optional no-op integration case.
- No dependency, API, or type changes.
