## MODIFIED Requirements

### Requirement: Trim redundant reducer-centric unit tests
Unit tests whose assertions are fully covered by new integration tests SHALL be removed from the following files. Remaining unit tests in those files SHALL continue to cover boundary math, exhaustive clamping logic, and edge cases not efficiently exercisable via integration tests.

- `test/wrap-toggle.test.ts` — Delete happy-path dispatch tests for `TOGGLE_WRAP`. Keep tests that verify invariants (e.g., "preserves other state fields").
- `test/reload.test.ts` — Delete simple "dispatch RELOAD_FILE, check requests replaced" tests. Keep name-based selection preservation, reset-to-0 when name not found, and `CLEAR_RELOAD_MESSAGE` invariant tests.
- `test/file-load.test.ts` — Delete happy-path tests for `ENTER_FILE_LOAD`, `UPDATE_FILE_LOAD_INPUT`, `SET_FILE_LOAD_ERROR`, `LOAD_FILE`, and `CANCEL_FILE_LOAD`. Keep name-based reselection, name-not-found reset, and invariant tests.
- `test/edge-jump.test.ts` — Delete tests that duplicate coverage provided by the integration tests in `test/integration/edge-jump.test.tsx`. Keep tests that verify `maxOffset` clamping, cross-panel branching, and boundary math for each panel type.

#### Scenario: wrap-toggle UT file shrinks
- **WHEN** `test/wrap-toggle.test.ts` is examined after the change
- **THEN** it SHALL contain fewer test cases than before
- **AND** the remaining tests SHALL assert on state invariants rather than simple toggle dispatch

#### Scenario: file-load UT file retains edge cases
- **WHEN** `test/file-load.test.ts` is examined after the change
- **THEN** it SHALL retain tests for name-based reselection and name-not-found edge cases
- **AND** it SHALL NOT contain tests that merely dispatch `ENTER_FILE_LOAD`/`UPDATE_FILE_LOAD_INPUT` and check a single field on the resulting state

#### Scenario: reload UT file retains name-matching logic tests
- **WHEN** `test/reload.test.ts` is examined after the change
- **THEN** it SHALL retain the name-based selection preservation test
- **AND** it SHALL retain the name-not-found reset test
- **AND** it SHALL retain `CLEAR_RELOAD_MESSAGE` invariant tests

#### Scenario: edge-jump UT file retains boundary math tests
- **WHEN** `test/edge-jump.test.ts` is examined after the change
- **THEN** it SHALL retain tests covering `maxOffset` clamping behavior for details and response panels
- **AND** it SHALL retain tests covering the `wrapMode === 'wrap'` guard on `JUMP_HORIZONTAL`
- **AND** it SHALL retain tests covering empty-requests edge cases

### Requirement: AGENTS.md documents test tier structure
`AGENTS.md` SHALL describe the three tiers of tests (pure unit / reducer unit / integration) and note the `test/integration/` directory. It SHALL reference `test/helpers/integration.ts` as the shared helper for integration tests.

#### Scenario: AGENTS.md mentions test/integration directory
- **WHEN** a contributor reads the Testing section of `AGENTS.md`
- **THEN** it SHALL mention that integration tests live in `test/integration/` and use `ink-testing-library` via `test/helpers/integration.ts`

#### Scenario: AGENTS.md describes test tiers
- **WHEN** a contributor reads the Testing section of `AGENTS.md`
- **THEN** it SHALL describe the distinction between reducer unit tests (dispatch-action, check-state) and integration tests (keypress, check-rendered-frame)