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

### Decision 2: Leave the `REQUEST_CANCEL` unit tests as-is

`test/core/request-cancel.test.ts` pins the `REQUEST_CANCEL` reducer case in isolation — including that it preserves `response`. That contract is unchanged by this design; the fixture's in-flight-with-response state simply becomes unreachable through the real flow once `SEND_REQUEST` clears. The tests remain valid descriptions of the reducer case, and the new `SEND_REQUEST` tests plus an integration test pin the real flow.

## Risks / Trade-offs

- [Reverses a pinned behavior] → The current behavior is not accidental: `test/integration/request-cancel.test.tsx` names it ("…and restores the prior response") and asserts the prior body is visible after cancel. This change deliberately reverses that expectation, per the proposal; the test's assertions flip alongside the spec delta. The other cancel integration tests have no prior response and are unaffected.
- [Losing old-vs-new response comparison] → Not a capability today: the pane already hid the previous response during flight. Nothing is lost.
- [Unit fixture describes a state unreachable in the real flow] → Acceptable: the tests pin reducer-case contracts independently; the integration test covers the reachable flow. If this bothers a future maintainer, narrowing the fixture to `response: null` is a test-only change.
- [A future feature wants the previous response visible under the spinner] → Would require reverting Decision 1; this document records why the invariant was chosen so the trade-off can be revisited deliberately.
