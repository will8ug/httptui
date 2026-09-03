# Tasks: clear-stale-response-on-dispatch

## 1. Tests first (red)

- [x] 1.1 Flip the cancel-restores-response integration test in `test/integration/request-cancel.test.tsx`: rename `Escape during a slow in-flight request aborts it, clears loading, and restores the prior response` to reflect the new outcome (leaves the empty prompt), and change its final assertions to `toContain('Request canceled')`, `toContain('Press Enter to send a request')`, `not.toContain('first payload')` — keep `not.toContain('Sending request')`. Verify with `npx vitest run test/integration/request-cancel.test.tsx`: this test fails red before implementation. Leave the file's other four tests untouched.
- [x] 1.2 Add reducer coverage for the `SEND_REQUEST` case in a new `test/core/request-lifecycle.test.ts`: dispatching over a state with a prior `response` and `requestError` clears both, sets `isLoading: true`, and resets `responseScrollOffset`/`responseHorizontalOffset`. Verify with `npx vitest run test/core/request-lifecycle.test.ts`: fails red against the current reducer.
- [x] 1.3 Realign `test/core/request-cancel.test.ts` with the reachable in-flight state (design Decision 2): slim `loadingState()` to reachable fields (`isLoading: true` plus distinctive request/details offsets; dispatch-cleared fields left at `createInitialState` defaults); replace `preserves the previously displayed response untouched` with a sequence test — prior response and error → `SEND_REQUEST` → `REQUEST_CANCEL` → both null; remove `preserves a prior requestError untouched` and `leaves search state untouched`; adjust `leaves scroll offsets untouched` to assert response offsets at 0 and request/details offsets at their distinctive values. Verify with `npx vitest run test/core/request-cancel.test.ts`: sequence test red, remaining tests green.

## 2. Implementation (green)

- [x] 2.1 Add `response: null` to the `SEND_REQUEST` case in `src/core/reducers/lifecycle.ts` (one line, next to the existing `requestError: null`). Verify with `npx vitest run test/core/request-lifecycle.test.ts test/core/request-cancel.test.ts test/core/search.test.ts test/integration/request-cancel.test.tsx`: all pass — `REQUEST_CANCEL`'s reducer case itself is unchanged; only its fixtures/tests were realigned in 1.3.

## 3. Verification

- [x] 3.1 Run the full checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run typecheck:test` — all pass with no new failures.
