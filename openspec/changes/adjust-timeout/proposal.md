## Why

Testing slow APIs fails today: every request is killed by a hardcoded 30-second wall-clock timeout (`AbortSignal.timeout(30000)` in the executor), which surfaces in the response panel as the opaque error `The operation was aborted due to timeout (23)`. The equivalent curl command succeeds because curl imposes no overall deadline by default. For a REST testing tool, waiting for the final response is the point — the tool's own timeout is the bug.

## What Changes

- Remove the hardcoded 30-second overall timeout from the executor. Slow-but-alive servers now complete; unresponsive connections still fail via undici's built-in inactivity timeouts (300s headers/body, 10s connect).
- `Esc` in normal mode cancels an in-flight request. The user becomes the timeout, mirroring curl's model (no default max-time; `Ctrl+C` is your timeout).
- Cancellation is reported as a transient warning in the status bar (reusing the existing transient-warning mechanism), never as a red error panel. The previously displayed response stays visible.
- The loading indicator gains an `(Esc to cancel)` hint.
- A response that arrives after cancellation is discarded rather than rendered.

## Capabilities

### New Capabilities
- `request-cancel`: Canceling an in-flight request with `Esc` — abort semantics, transient-warning display, retention of prior response content, and discarding of late responses.

### Modified Capabilities
- `executor`: Request execution behavior changes from "use a 30-second timeout" to "impose no overall deadline; rely on undici default inactivity timeouts", and the executor accepts an external `AbortSignal` for cancellation.
- `navigation`: The mandated Escape priority chain in normal mode gains a step: an in-flight request is canceled before fullscreen-exit and search-dismiss are considered.
- `response-view`: The loading-state spinner label gains the `(Esc to cancel)` hint.
- `copy-as-curl`: The requirement prose justifying "no `--max-time` emitted" references the executor's 30-second timeout; the justification is updated to reflect that the executor imposes no timeout.

## Impact

- `src/core/executor.ts` — replace `AbortSignal.timeout(30000)` with an optional caller-provided signal.
- `src/app.tsx` — own an `AbortController` per in-flight request, add the Esc-cancel branch to `useInput`, guard against the settle race (response arriving after cancel).
- `src/core/reducer.ts` — new `REQUEST_CANCEL` action (clear `isLoading`, set transient warning, leave response/error state untouched).
- `src/components/ResponseView.tsx` — loading-state hint.
- `HelpOverlay` and `README.md` — document the Esc behavior.
- No dependency changes; no breaking changes to file formats or CLI flags.
