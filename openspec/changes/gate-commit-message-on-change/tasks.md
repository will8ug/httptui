## 1. Reducer change

- [x] 1.1 In `src/core/reducer.ts`, `COMMIT_EDIT` case: compute `const changed = nextBody !== request.body;` and use it for both `isDirty: state.isDirty || changed` and `transientMessage: changed ? 'Body updated' : null` (per design Decision 1). Keep buffer/cursor/scroll resets and `mode: 'normal'` unconditional.

## 2. Tests

- [x] 2.1 Add a unit test in `test/core/request-editing.test.ts` under `COMMIT_EDIT` asserting that committing an unchanged buffer sets `transientMessage` to `null` (and still closes the editor / returns to normal mode).
- [x] 2.2 Add a unit test asserting that committing a changed buffer still sets `transientMessage: 'Body updated'` (may already be covered by the existing "stores the edited body" test — extend it only if it does not assert the message).
- [x] 2.3 Add an integration test in `test/integration/request-body-editing.test.tsx`: open editor, press `Ctrl+S` without typing, assert the frame does NOT contain `Body updated` and the overlay closes.
- [x] 2.4 Run `npm test` (or the repo's test command) and confirm all tests pass, including existing `request-editing` and `request-body-editing` suites.

## 3. Validation

- [x] 3.1 Run `npm run typecheck` / `tsc --noEmit` (or the repo's type-check command) — no new type errors.
- [x] 3.2 Run lint (repo's configured linter) on changed files — no new warnings.
- [x] 3.3 Verify coverage for the new `COMMIT_EDIT` branch (changed vs unchanged) is exercised by the new tests.
