## Context

The reducer (`src/core/reducer.ts`) is designed around a clean contract: `LOAD_FILE` and `RELOAD_FILE` receive **file-only** variables in `action.variables`. The reducer stores these verbatim into `state.fileVariables` and re-merges with `state.environmentVariables` to produce `state.variables`. This contract is enforced by `test/core/env-switcher.test.ts:128-150`, which dispatches with file-only vars and asserts the reducer correctly re-merges.

The caller (`src/app.tsx`) violates this contract. In both the `o` (file load, line 184) and `R` (reload, line 386) handlers, `app.tsx` calls `mergeVariables(parseResult.variables, state.environmentVariables)` *before* dispatching. The reducer then:

1. Stores the **pre-merged blob** as `state.fileVariables` — silently polluting the pristine base with env values.
2. Calls `mergeVariables` on the already-merged input with `state.environmentVariables` again — idempotent no-op.

The pollution is silent because `mergeVariables` overrides file vars with env vars on conflict, so the "pristine" base now contains env-overridden values. Later, when `SWITCH_ENV` is applied with `(none)`, the reducer does `mergeVariables(state.fileVariables, [])` — which returns `state.fileVariables` unchanged, still polluted.

The result: a user who loads a new file while env `LocalAPI` is active, then switches to `(none)`, sees `LocalAPI`'s values instead of the new file's. This contradicts the spec `runtime-environment-switching` → "Pristine file-variable base preserved across reload and file load".

## Goals / Non-Goals

**Goals:**
- Restore the reducer's contract: callers must pass file-only variables to `LOAD_FILE` and `RELOAD_FILE`.
- Make `(none)` env selection correctly fall back to the *currently loaded* file's variables.
- Add regression tests at the unit and integration level so this can't regress silently.
- Document the invariant in the existing spec.

**Non-Goals:**
- Refactoring the reducer (it's already correct).
- Changing the merge precedence rules (env still wins over file).
- Adding new env/file switching features.
- Touching the `(none)` reducer path (`SWITCH_ENV` with `envName: null` is correct as-is).

## Decisions

### Decision 1: Drop the pre-merge in `app.tsx` (Option A from exploration)

**Rationale:** The reducer is already designed to handle the merge. The pre-merge is redundant work and the source of the bug. Removing it aligns the caller with the reducer's contract, the existing unit tests, and the spec.

**Alternatives considered:**

- **Option B — Keep the pre-merge, change the reducer contract:** Would require adding a separate `action.fileVariables` field to `LOAD_FILE` and `RELOAD_FILE`, updating `Action` type, updating reducer, and updating the existing test. More churn, no benefit, and breaks the simpler "one variables field" abstraction.
- **Move the merge to a new helper that both caller and reducer use:** Adds a function for the sake of DRY when the operation is already a 1-line call. Not worth the indirection.

### Decision 2: Test at three layers

**Rationale:** Different test layers catch different regressions:

| Layer | File | What it locks in |
|---|---|---|
| Unit (reducer) | `test/core/file-load.test.ts`, `test/core/reload.test.ts` | Reducer contract — if someone in the future adds a new caller that violates the contract, the test against the *real* `app.tsx`-shaped path will catch it. |
| Integration | `test/integration/file-load.test.tsx` | End-to-end repro of the user's bug (load new file + switch to (none)). Most important for regression. |

The unit test against the reducer alone wouldn't catch the bug because the existing test at `env-switcher.test.ts:128` already passes — it dispatches correctly. The bug only manifests when a caller violates the contract. The integration test is the highest-value regression test.

## Risks / Trade-offs

- **Risk:** Existing user muscle memory expects the buggy behavior (env "sticks" across file changes).
  → **Mitigation:** The behavior change aligns with the spec that already documents it. The status bar's env indicator + the spec scenario in the new tests give users a clear signal that env is per-file-load.

- **Risk:** Other code paths (e.g. Postman collection import, future "recent files" feature) might also pre-merge.
  → **Mitigation:** A search for `mergeVariables(.*environmentVariables)` in `app.tsx` (the only caller in production) confirms there are no other pre-merge call sites. The integration test exercises the full `o` → `E` → `(none)` path and will fail loudly if any future code path reintroduces the pollution.

- **Risk:** Test fixtures might assume the pre-merge behavior.
  → **Mitigation:** The existing `env-switcher.test.ts:128` test already uses file-only vars and passes. Other unit tests in `file-load.test.ts` and `reload.test.ts` use isolated `createInitialState` calls and don't depend on env merge behavior. Will re-verify when adding new tests.

## Migration Plan

No migration needed. This is a pure bug fix. Deploy by merging the PR; users on the buggy version will see corrected behavior immediately on next file load + env switch.

## Open Questions

None. The fix is mechanical, the spec already documents the intended behavior, and the existing test infrastructure supports the regression tests.
