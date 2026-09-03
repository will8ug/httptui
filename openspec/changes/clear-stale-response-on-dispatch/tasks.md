# Tasks: clear-stale-response-on-dispatch

## 1. Tests first (red)

- [ ] 1.1 Flip the cancel-restores-response integration test in `test/integration/request-cancel.test.tsx`: rename `Escape during a slow in-flight request aborts it, clears loading, and restores the prior response` to reflect the new outcome (leaves the empty prompt), and change its final assertions to `toContain('Request canceled')`, `toContain('Press Enter to send a request')`, `not.toContain('first payload')` — keep `not.toContain('Sending request')`. Verify with `npx vitest run test/integration/request-cancel.test.tsx`: this test fails red before implementation. Leave the file's other four tests untouched.
- [ ] 1.2 Add reducer coverage for the `SEND_REQUEST` case in a new `test/core/request-lifecycle.test.ts`: dispatching over a state with a prior `response` and `requestError` clears both, sets `isLoading: true`, and resets `responseScrollOffset`/`responseHorizontalOffset`. Verify with `npx vitest run test/core/request-lifecycle.test.ts`: fails red against the current reducer.

## 2. Implementation (green)

- [ ] 2.1 Add `response: null` to the `SEND_REQUEST` case in `src/core/reducers/lifecycle.ts` (one line, next to the existing `requestError: null`). Verify with `npx vitest run test/core/request-lifecycle.test.ts test/core/request-cancel.test.ts test/core/search.test.ts test/integration/request-cancel.test.tsx`: all pass — `REQUEST_CANCEL`'s own contract is unchanged (design Decision 2), so `test/core/request-cancel.test.ts` needs no edits.

## 3. Verification

- [ ] 3.1 Run the full checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run typecheck:test` — all pass with no new failures.
