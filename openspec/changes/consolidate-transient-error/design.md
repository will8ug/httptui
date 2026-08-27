## Context

See proposal.md - Why. Two transient-error paths exist today: the domain-specific `RELOAD_ERROR` (5 dispatch sites in `app.tsx`, payload `ErrorInfo`, clears only `transientMessage`) and the general `SET_TRANSIENT_ERROR` from `paste-as-curl` (2 dispatch sites, payload `string`, clears both other channels). The status-bar spec already mandates three-channel mutual exclusivity; `RELOAD_ERROR`'s reducer violates it by leaving `transientWarning` set. The `copy-as-curl` spec already mandates failure-as-transient-error; `copySelectedAsCurl` violates it by dispatching `SET_TRANSIENT_MESSAGE`.

## Goals / Non-Goals

**Goals:**

- One action (`SET_TRANSIENT_ERROR`) as the only way to raise a status-bar transient error.
- Bring the two spec violations into compliance (warning clearing, copy failure channel).
- Reword status-bar spec scenarios to observable behavior; codify that principle in `AGENTS.md`.
- Preserve every invariant currently tested in `test/core/reload-error.test.ts`.

**Non-Goals:**

- Touching `REQUEST_ERROR` (response panel), `SET_FILE_LOAD_ERROR`, `SET_ENV_SELECT_ERROR`, `SET_SAVE_ERROR` (overlay-inline errors) — different rendering surfaces, not status-bar transients.
- Changing any error message wording (including whether copy failures name the remedy tool).
- Introducing a helper action, middleware, or an error-sourcing taxonomy.

## Decisions

### Decision 1: Delete `RELOAD_ERROR` outright; do not keep a domain alias

Alternative considered: keep `RELOAD_ERROR` as a semantic action whose reducer delegates to the transient channel. Rejected: the domain information lives in the error text ("File not found") and the dispatch context (surrounding `readFileSync`/`parseAnyFormat` calls), not in the action name. Successes already flow through the generic `transientMessage` channel (`RELOAD_FILE` sets `Reloaded` directly in the reducer), so errors going generic restores symmetry. If reload failures ever need side effects beyond display, a domain action can be reintroduced then and delegate internally.

### Decision 2: Payload stays `string`; call sites extract `toErrorInfo(error).message`

`SET_TRANSIENT_ERROR`'s payload is the display text; `paste-as-curl` sites already pass plain strings. The five reload sites become `dispatch({ type: 'SET_TRANSIENT_ERROR', error: toErrorInfo(error).message })`. `toErrorInfo` remains the single unknown-to-message normalization point; no new `toErrorMessage` helper (5 mechanical usages don't justify it).

### Decision 3: Warning-clearing semantics come from `SET_TRANSIENT_ERROR`

After migration, a reload error clears a showing warning — the only observable behavior change on the reload path, and the behavior the status-bar spec already requires. The delta spec adds a "Transient error clears showing warning" scenario as the regression anchor.

### Decision 4: `copySelectedAsCurl` catch branch switches channel, message unchanged

`SET_TRANSIENT_MESSAGE` → `SET_TRANSIENT_ERROR` with the identical message expression. The channel (red bold vs green) was the violation; message content is a non-goal.

### Decision 5: Test re-homing

Delete `test/core/reload-error.test.ts`. Re-home its invariants: the transient reducer tests gain (a) `SET_TRANSIENT_ERROR` clears message and warning, (b) a single structural test that it touches nothing beyond the three transient fields (absorbing the "does NOT clear response / search / isLoading" cases). The `SET_TRANSIENT_MESSAGE`-clears-error case already exists there. The copy-as-curl failure test switches its expectation from the success channel to the error channel.

### Decision 6: `AGENTS.md` guidance goes under "OpenSpec spec maintenance"

One new bullet in the existing section: scenarios state observable behavior (e.g. "WHEN a transient error is set"), never internal action names (e.g. "WHEN `RELOAD_ERROR` is dispatched") — action names are implementation details that leak and rot when actions are renamed or consolidated. Cite this change as precedent.

## Risks / Trade-offs

- [Missed `RELOAD_ERROR` references] → Deleting it from the `Action` union turns any surviving dispatch or reducer case into a compile error; TypeScript exhaustiveness is the safety net. Verify with a repo-wide grep in the final task.
- [Loss of a semantic hook for future reload side effects] → Accepted (YAGNI); reintroduction path is cheap and internal-delegating (Decision 1).
- [Spec wording churn masks a behavioral change] → The delta is wording-only except the new warning-clearing scenario, which documents behavior the main spec already required; the archive diff review should confirm no other requirement text drifted.

## Migration Plan

Single commit; no persisted state, config, or wire format involved. Rollback is `git revert`. Spec sync applies the status-bar delta to `openspec/specs/status-bar/spec.md` at archive time.
