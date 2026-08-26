## 1. Executor: remove wall clock, accept external signal

- [ ] 1.1 Update executor unit tests: remove/replace tests asserting the 30-second timeout behavior; add a test that `executeRequest` completes against a server that responds slower than any previous deadline (e.g. ~300ms delay, well under undici inactivity limits) and a test that an externally-aborted signal rejects the request
- [ ] 1.2 In `src/core/executor.ts`, delete `signal: AbortSignal.timeout(30000)` and add an optional `AbortSignal` parameter threaded into `undici.request()`'s `signal` option (no signal passed when absent)
- [ ] 1.3 Verify executor tests pass (`src/core/executor` test suite)

## 2. App: Escape cancel plumbing

- [ ] 2.1 Add reducer unit tests for `REQUEST_CANCEL`: clears `isLoading`, sets `transientWarning`, preserves `response` and `requestError`, resets nothing else
- [ ] 2.2 Implement `REQUEST_CANCEL` in `src/core/reducer.ts` (mirror `SEND_REQUEST`'s minimalism per design Decision 4)
- [ ] 2.3 In `src/app.tsx`: add an `AbortController` ref; `sendSelectedRequest` creates a controller, stores it in the ref, passes its signal to `executeRequest`, and clears the ref in `finally`; add the settle-race guard (`if (controller.signal.aborted) return;`) before dispatching `RECEIVE_RESPONSE`/`REQUEST_ERROR`, including in the catch path
- [ ] 2.4 In `src/app.tsx` `useInput`: insert the normal-mode Escape branch — when `state.isLoading`, call `controller.abort()` and dispatch `REQUEST_CANCEL` with warning `Request canceled` — placed after all mode/overlay handlers and before the fullscreen-exit and search-dismiss Escape handlers (design Decision 3)
- [ ] 2.5 Add integration tests: Escape during a slow in-flight request aborts it (transient warning shown, loading cleared, prior response reappears); a response arriving after cancel is not rendered; Escape with help overlay open while loading closes the overlay without canceling; Escape while loading in fullscreen cancels but stays fullscreen; Enter after cancel starts a new request

## 3. UI affordances

- [ ] 3.1 Update `ResponseView` loading-state tests to expect the `(Esc to cancel)` hint alongside the `Sending request` spinner
- [ ] 3.2 Render the dimmed `(Esc to cancel)` hint in `src/components/ResponseView.tsx` loading branch
- [ ] 3.3 Add the Escape-while-loading row to the help overlay and the README keyboard shortcuts table

## 4. Verification

- [ ] 4.1 Run the full test suite, lint, and build; confirm no regressions and no lingering references to the 30-second timeout
