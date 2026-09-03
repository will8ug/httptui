# Design: clear-stale-response-on-dispatch

## Context

See `proposal.md` — Why for motivation.

The request lifecycle lives in `src/core/reducers/lifecycle.ts`. Four transitions touch the response pane today:

| Action | `response` | `isLoading` | `requestError` |
|---|---|---|---|
| `SEND_REQUEST` | untouched | `true` | `null` |
| `RECEIVE_RESPONSE` | replaced | `false` | `null` |
| `REQUEST_ERROR` | `null` | `false` | error |
| `REQUEST_CANCEL` | untouched | `false` | untouched |

`ResponseView` renders by priority: loading spinner > error > empty prompt > response body. While a request is in flight the spinner branch wins, so the stored response is invisible during flight — it exists only as state, and `REQUEST_CANCEL` is the one transition through which it becomes visible again.

## Goals / Non-Goals

**Goals:**
- The response pane never displays a response the latest request cycle did not produce.
- Enforce that invariant at a single point, so every terminal state (success, error, cancel, and any future timeout) is consistent by construction.

**Non-Goals:**
- Request timeouts (none exist; a future timeout should dispatch `REQUEST_ERROR` and inherits this behavior for free).
- Keeping the previous response visible during flight (Insomnia/Bruno-style overlay). The spinner already replaces pane content, so there is nothing to preserve.
- Per-request response memory or response-provenance labeling (separate concern).
- Any status-bar change; the existing `Request canceled` transient warning stays as specified in the **status-bar** spec.

## Decisions

### Decision 1: Clear the response in `SEND_REQUEST`, not in `REQUEST_CANCEL`

`SEND_REQUEST` gains `response: null` next to its existing `requestError: null` reset. `REQUEST_CANCEL` stays untouched.

Rationale: because the spinner occludes the pane during flight, clearing at dispatch and clearing at cancel are observationally identical in the current UI — the only user-visible difference from today is the cancel path. Dispatch-time clearing wins on state semantics:

- The invariant is enforced once at the cycle's entry point instead of being distributed across exits. A cancel (or future timeout) that forgets to clear cannot reintroduce staleness.
- It removes the latent stale-in-flight state: anything reading `response` mid-flight sees `null`, not data from the previous cycle.
- It matches existing precedent: `REQUEST_ERROR` and `RELOAD_FILE` already clear `response`.

Alternatives considered:

- **Clear in `REQUEST_CANCEL`**: equally observable today, but keeps zombie state during flight and makes every future terminal transition remember to clear. Rejected.
- **Render-level fix** (ResponseView suppresses the body after a cancel): requires new state to track "a cancel happened", duplicates what state transitions should own. Rejected.

### Decision 2: Realign the `REQUEST_CANCEL` unit suite with the reachable in-flight state

After Decision 1, the in-flight state reachable through the real flow is fully determined by dispatch: `response` and `requestError` null, response scroll offsets reset to 0, search state cleared; everything else (request/details offsets, selection, focus, transient channels) carries over. `SEND_REQUEST` already enforced all of that except the response nulling before this change, so the unit fixture's response, prior-error, response-offset, and search values described unreachable states already — response is just the newest member. The suite is realigned:

- The `loadingState()` fixture sets only reachable fields: `isLoading: true` plus distinctive request/details offsets. Dispatch-cleared fields (response, requestError, response offsets, search state) stay at their `createInitialState` defaults, mirroring what dispatch leaves behind. The fixture stays hand-built rather than derived by dispatching `SEND_REQUEST`, keeping the cancel tests decoupled from send behavior (pinned separately in `test/core/request-lifecycle.test.ts`).
- `preserves the previously displayed response untouched` is replaced by a sequence test: prior response and error → `SEND_REQUEST` → `REQUEST_CANCEL` → both null. It pins the unit-level claim this change exists for — dispatch clears, cancel does not resurrect — and fails red before implementation.
- `preserves a prior requestError untouched` and `leaves search state untouched` are removed: with dispatch clearing both before the flight, cancel-time preservation is unobservable. Their reachable essence (nothing set after a cancel) is covered by the existing nothing-prior test and the sequence test.
- `leaves scroll offsets untouched` asserts the response offsets at their dispatch-reset values (0) and keeps distinctive values for the request/details offsets, which dispatch preserves.

Alternatives considered:

- **Keep the suite as-is** (transition-contract view: the reducer is a total function, pin non-interference for every field regardless of reachability). Rejected: `preserves the previously displayed response` makes a display claim the spec delta now contradicts, and once one test documents non-existent behavior, the unreachable fixture values become misleading scaffolding for the rest.
- **Derive the fixture by dispatching real actions** (build in-flight state via `SEND_REQUEST` over a populated state). Rejected: couples every cancel test to send behavior; a legitimate `SEND_REQUEST` change would silently shift what the cancel tests exercise.

## Risks / Trade-offs

- [Reverses a pinned behavior] → The current behavior is not accidental: `test/integration/request-cancel.test.tsx` names it ("…and restores the prior response") and asserts the prior body is visible after cancel. This change deliberately reverses that expectation, per the proposal; the test's assertions flip alongside the spec delta. The other cancel integration tests have no prior response and are unaffected.
- [Losing old-vs-new response comparison] → Not a capability today: the pane already hid the previous response during flight. Nothing is lost.
- [Removed transition-contract pins leave `REQUEST_CANCEL` non-interference pinned only for reachable fields] → Deliberate: interference with state that cannot exist during a flight is unobservable by definition. If a future feature makes those fields reachable in-flight, its own tests re-pin them then.
- [Hand-built fixture can drift from real dispatch behavior] → Bounded: `test/core/request-lifecycle.test.ts` pins dispatch's clearing, so if `SEND_REQUEST` stops clearing a field, the lifecycle test fails before this fixture can mislead.
- [A future feature wants the previous response visible under the spinner] → Would require reverting Decision 1; this document records why the invariant was chosen so the trade-off can be revisited deliberately.
