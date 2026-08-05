## Context

`COMMIT_EDIT` in `src/core/reducer.ts` unconditionally sets `transientMessage: 'Body updated'` on every commit, even when the edit buffer equals the stored body. The adjacent `isDirty` computation already performs the correct no-op detection (`nextBody !== request.body`), and existing tests confirm `isDirty` stays `false` for unchanged commits. The message is the only unconditional side effect of a no-op commit. `app.tsx` dispatches `COMMIT_EDIT` and always calls `scheduleTransientClear()` afterward; that timer merely clears whatever message exists (or a `null`), so it needs no change.

## Goals / Non-Goals

**Goals:**
- A no-op commit (buffer identical to the stored body) shows no transient message.
- A commit that actually changes the body still shows "Body updated".
- The fix lives in the reducer (single source of truth for state transitions), mirroring the existing `isDirty` condition.

**Non-Goals:**
- Rewording the message for real changes ("Body updated" stays).
- Option B-style acknowledgment on no-op commits (e.g., "No changes to save").
- Changing commit semantics: overlay close, buffer/cursor/scroll resets, and `isDirty` updates are untouched.
- Skipping `scheduleTransientClear()` in `app.tsx` — harmless on a `null` message, and keeping the call site uniform avoids an extra `if`.

## Decisions

### Decision 1: Gate `transientMessage` on `nextBody !== request.body`

In the `COMMIT_EDIT` case, compute `const changed = nextBody !== request.body` once, use it for both `isDirty` and the message:

```ts
const nextBody = state.editBuffer === '' ? undefined : state.editBuffer;
const changed = nextBody !== request.body;
const updatedRequests = state.requests.map((req, i) =>
  i === state.selectedIndex ? { ...req, body: nextBody } : req,
);
return {
  ...state,
  requests: updatedRequests,
  isDirty: state.isDirty || changed,
  mode: 'normal',
  editTarget: 'body',
  editBuffer: '',
  editCursor: 0,
  editScrollOffset: 0,
  editHorizontalOffset: 0,
  transientMessage: changed ? 'Body updated' : null,
  transientError: null,
};
```

Buffer reset and mode transitions remain unconditional — only the message is gated.

*Alternative considered — short-circuit return on no-op.* Rejected: it duplicates the buffer/offset reset block or forces extraction, and the spec still requires the overlay to close and state to normalize on every commit. Gating a single field is the minimal correct change.

*Alternative considered — gate at the dispatch site in `app.tsx` (skip `COMMIT_EDIT` when the buffer equals the body).* Rejected: that comparison would live outside the reducer, duplicating the normalization logic (`''` → `undefined`), and it would leak state-transition policy into the input handler.

### Decision 2: No-op commits set `transientMessage: null` explicitly

A no-op commit must not leave a stale message from a previous action on screen. Setting `transientMessage: null` (rather than leaving the field untouched) guarantees a clean status bar and keeps the field's lifetime reducer-owned.

## Risks / Trade-offs

- [Stale message if `null` is not set] → Explicit `null` assignment on no-op (Decision 2) prevents any previously displayed message from lingering.
- [`nextBody !== request.body` diverges from `isDirty` semantics over time] → Both derive from the same `changed` variable (Decision 1), so they cannot drift.
- [Empty-buffer normalization edge case] → Already safe: `editBuffer === '' ? undefined : editBuffer` round-trips an untouched `undefined` body to `undefined`, so no false positive.
