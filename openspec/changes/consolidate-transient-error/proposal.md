## Why

`paste-as-curl` introduced a general-purpose `SET_TRANSIENT_ERROR` action, but the older domain-specific `RELOAD_ERROR` action survives alongside it with near-identical reducer behavior — and two latent inconsistencies came along for the ride: `RELOAD_ERROR` does not clear `transientWarning`, violating the status-bar spec's three-channel mutual exclusivity; and `copySelectedAsCurl` reports failures via `SET_TRANSIENT_MESSAGE`, showing clipboard errors in green as successes, violating the copy-as-curl spec's failure-reporting requirement. Consolidating onto the single general action fixes both compliance gaps and removes duplicated reducer logic.

## What Changes

- Remove the `RELOAD_ERROR` action; migrate its five dispatch sites (reload key, editor-handoff stat/handoff/re-read, confirm-discard reload) to `SET_TRANSIENT_ERROR`.
- Reload errors now clear a showing transient warning, bringing the code into compliance with the status-bar spec's mutual-exclusivity requirement (previously a reload error could render side-by-side with a warning).
- Fix `copySelectedAsCurl` to report clipboard failures via `SET_TRANSIENT_ERROR` instead of `SET_TRANSIENT_MESSAGE`, so failures render in red bold as the copy-as-curl spec requires.
- Rewrite the status-bar spec scenarios that name internal action types (`RELOAD_ERROR`, `SET_TRANSIENT_MESSAGE`) in observable-behavior terms, since `RELOAD_ERROR` ceases to exist and action names are implementation details.
- Add guidance to `AGENTS.md`: spec scenarios state observable behavior, not internal action names.
- Absorb `test/core/reload-error.test.ts` into the transient-channel tests; its "does NOT touch response/search/isLoading" invariants are preserved because `SET_TRANSIENT_ERROR` only writes the three transient fields.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `status-bar`: scenario wording in the "Transient error message" and "Transient warning message" requirements becomes action-agnostic — WHEN clauses describe a transient channel being set, not a specific dispatched action. No observable behavior changes; the mutual-exclusivity requirements already specify the target behavior.

## Impact

- `src/core/types.ts` — delete `RELOAD_ERROR` from the `Action` union.
- `src/core/reducer.ts` — delete the `RELOAD_ERROR` case.
- `src/app.tsx` — five `RELOAD_ERROR` dispatch sites switch to `SET_TRANSIENT_ERROR` with `toErrorInfo(error).message`; `copySelectedAsCurl` error path switches from `SET_TRANSIENT_MESSAGE` to `SET_TRANSIENT_ERROR`.
- `test/core/reload-error.test.ts` — removed, invariants re-homed; transient-channel tests gain reload-error and warning-clearing coverage; copy-as-curl failure test expects the error channel.
- `openspec/specs/status-bar/spec.md` — scenario rewording (via this change's delta).
- `AGENTS.md` — new spec-maintenance guidance.
- No spec deltas needed for `file-reload` or `copy-as-curl`: both already specify the target behavior behaviorally; this change brings the code into compliance.
