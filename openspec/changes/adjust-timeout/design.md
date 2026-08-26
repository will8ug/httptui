## Context

The executor (`src/core/executor.ts`) passes `signal: AbortSignal.timeout(30000)` to `undici.request()` — a 30-second wall-clock deadline that aborts slow requests with a `DOMException [TimeoutError]` whose legacy code 23 renders as `The operation was aborted due to timeout (23)`. undici's own default inactivity timeouts (300s headers/body, 10s connect) already bound genuinely dead connections, so the wall clock only kills healthy slow requests. The app's request flow (`sendSelectedRequest` in `src/app.tsx`) awaits `executeRequest` while Ink keeps rendering and `useInput` keeps firing; `state.isLoading` marks the in-flight window and re-entry is already guarded. Escape in normal mode currently falls through to fullscreen-exit and search-dismiss handlers; overlay modes each consume Escape first.

## Goals / Non-Goals

**Goals:**
- Slow-but-alive requests complete, matching curl's default behavior (no overall deadline).
- The user can cancel an in-flight request with Escape; cancel is deliberate feedback, never an error.
- Late responses from a canceled request never clobber the post-cancel UI state.

**Non-Goals:**
- No configurable timeout (CLI flag, config file, or per-request directive). If wanted later, it composes via `AbortSignal.any([userSignal, timeoutSignal])` on Node ≥ 24.
- No changes to undici Agent-level timeouts (`connectTimeout`, `headersTimeout`, `bodyTimeout` stay at defaults).
- No honor of `--max-time` / `--connect-timeout` when pasting curl commands (they remain skipped flags, now with an accurate justification).
- No cancel keybinding other than Escape, and no cancel trigger while overlays are open.

## Decisions

### Decision 1: Remove the wall clock entirely instead of raising it
Delete `AbortSignal.timeout(30000)`; pass no signal unless the caller supplies one.
*Why not raise to e.g. 300s:* any wall clock restarts the same bug for someone slower. undici's inactivity defaults already bound dead connections, and Decision 2 gives the user manual control for the "server is hung" case — together they cover what the wall clock tried to do, without its false positives.
*Alternative rejected:* keep a large default timeout — preserves the failure mode, adds a magic number to document.

### Decision 2: App owns one `AbortController` per in-flight request, passed to the executor
`sendSelectedRequest` creates a controller, stores it in a `useRef`, and passes `controller.signal` to `executeRequest` as a new optional parameter that replaces the hardcoded timeout signal. The ref is cleared in a `finally` block.
*Why a ref, not state:* the controller is an imperative handle read by the Escape handler; it must not trigger re-renders and must be readable inside `useInput`'s closure.
*Alternative rejected:* executor creates the controller and exposes a cancel API — couples the pure execution module to UI lifecycle.

### Decision 3: Escape cancels only in normal mode, inserted before fullscreen-exit in the priority chain
In `useInput`, after all overlay/mode handlers return, a new branch checks `state.isLoading` first: create/handle cancel, return. Fullscreen-exit and search-dismiss move below it. Overlays keep their Escape meaning unchanged — the mode handlers already return before normal-mode handling executes.
*Why cancel wins over fullscreen-exit:* while waiting, the user's dominant intent for Escape is "stop waiting"; exiting fullscreen is recoverable (press `f`), a lost 60-second response is not.

### Decision 4: Cancel dispatches `REQUEST_CANCEL`; the abort renders as a transient warning, never `REQUEST_ERROR`
The Escape branch calls `controller.abort()` and dispatches `{ type: 'REQUEST_CANCEL', warning: 'Request canceled' }`. The reducer clears `isLoading`, sets `transientWarning`, and leaves `response`/`requestError` untouched (mirroring `SEND_REQUEST`, which also preserves `response`) — so a previously displayed response reappears once the spinner clears.
`controller.abort()` rejects the pending `undici.request()` with `DOMException [AbortError]` (legacy code 20); routing that through `REQUEST_ERROR` would recreate the `(23)`-style noise as `(20)` in red. The warning uses the existing `SET_TRANSIENT_WARNING`-style transient channel and clears via the existing `TRANSIENT_CLEAR_MS` timer.
*Alternative rejected:* render a neutral "Canceled" state in the response panel — adds a fifth content state to `ResponseView` for information the status bar already conveys.

### Decision 5: Settle-race guard in the request continuation
In `sendSelectedRequest`, after `await executeRequest(...)` resolves or throws, check `controller.signal.aborted` before dispatching: if aborted, return without dispatching `RECEIVE_RESPONSE`/`REQUEST_ERROR`. The abort rejection itself flows into the existing `catch` — the guard there is the same signal check, dispatching nothing (the warning already fired at cancel time).
*Why:* a response landing milliseconds after Escape would otherwise overwrite the canceled state with content the user explicitly abandoned.

### Decision 6: Loading hint in `ResponseView`, help and README rows
The loading branch renders the existing spinner plus a dimmed `(Esc to cancel)` hint line. Help overlay and README gain an Escape-while-loading row alongside the existing request shortcuts.

## Risks / Trade-offs

- [Hung server now waits up to undici's 300s inactivity limit if the user never presses Escape] → Mitigation: the loading hint makes the escape hatch visible; the wait matches curl's behavior, which users already accept.
- [Escape priority change surprises users who expected fullscreen-exit while a request runs] → Mitigation: documented in help/README; fullscreen remains toggled by `f` at any time.
- [Ref/controller lifecycle bugs (stale ref after cancel, double-send)] → Mitigation: existing `isLoading` re-entry guard blocks a second send; ref is cleared in `finally`; race guard keyed off `signal.aborted`, not ref identity.
- [Tests that rely on the 30-second timeout behavior or assert its error rendering] → Mitigation: executor tests updated in the same change; slow-server integration test uses a deliberate delay well under undici's inactivity limits so suites stay fast.

## Migration Plan

Single-version change, no persisted data affected. Rollback is reverting the commit. Users who relied on the 30s abort get an explicit error path removed — communicated in the changelog via the new Escape behavior.
