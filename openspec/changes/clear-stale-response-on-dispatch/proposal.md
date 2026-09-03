# Proposal: clear-stale-response-on-dispatch

## Why

When an in-flight request is cancelled with `Escape`, the response pane resurrects the previous request's response: the cancel transition clears the loading flag but leaves the stored response untouched. The `Request canceled` status-bar warning auto-clears after two seconds, after which nothing distinguishes the displayed response from a current one — a stale result can be mistaken for the cancelled request's outcome. This also contradicts the error path, which already clears the previous response.

## What Changes

- Dispatching a request clears the previous response: the `SEND_REQUEST` lifecycle transition sets `response` to `null` alongside its existing `requestError` reset.
- A cancelled request therefore leaves the response pane in the empty state (`Press Enter to send a request`) instead of restoring the previous response. The existing status-bar cancel warning is unchanged.
- No visible change while a request is in flight: the loading spinner already renders in place of response content, so the pane is identical during flight.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `response-view`: The empty state's entry condition generalizes from "no request has been sent yet" to the absence of a response, error, and in-flight request — adding the cancelled-request outcome: when a request dispatched over a previous response is cancelled, the pane shows the empty-state prompt, not the previous response.

## Impact

- `src/core/reducers/lifecycle.ts` — the `SEND_REQUEST` case gains `response: null`.
- Tests asserting lifecycle behavior around send/cancel need updating: the integration test that pinned restore-on-cancel flips to the empty-prompt outcome, and the `REQUEST_CANCEL` unit suite is realigned with the reachable in-flight state — tests asserting preservation of dispatch-cleared fields are removed or replaced by a dispatch-then-cancel sequence test.
- No changes to components, commands, executor, or status-bar behavior.
