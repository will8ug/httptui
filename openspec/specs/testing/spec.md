# Spec: Testing

## Purpose

Testing infrastructure for httptui: test directory structure, three-tier test classification, and shared helpers.

## Requirements

### Requirement: Test directory structure
Tests SHALL live under `test/`. Integration tests SHALL live under `test/integration/` with `.test.tsx` extension. Shared helpers SHALL live under `test/helpers/`.

#### Scenario: Vitest discovers all tests
- **WHEN** `npm test` is run
- **THEN** files matching `test/**/*.test.ts` and `test/integration/**/*.test.tsx` SHALL be discovered and executed by Vitest

#### Scenario: Integration tests render real App
- **WHEN** an integration test file is examined
- **THEN** it SHALL import `{ App }` from `../../src/app` and render it via `ink-testing-library`'s `render()` function

### Requirement: Three-tier test classification
The project SHALL maintain three tiers of tests:

1. **Reduction unit tests** (`test/reducer.test.ts`, `test/variables.test.ts`, etc.) — test pure functions by dispatching actions and checking resulting state.

2. **Integration tests** (`test/integration/`) — test the full `<App>` component by sending keypresses via `stdin.write` and asserting the rendered frame reflects expected state changes.

3. **Smoke tests** (`test/cli-smoke.test.ts`) — test CLI entry points end-to-end, verifying exit codes and error output.

#### Scenario: Reduction tests import real reducer
- **WHEN** a reduction test file is examined
- **THEN** it SHALL import `reducer` and `createInitialState` from `src/core/reducer`

#### Scenario: Integration tests use shared helpers
- **WHEN** an integration test file is examined
- **THEN** it SHALL import `renderApp`, `press`, `delay`, and `selectedLine` from `../helpers/integration`

### Requirement: Integration test coverage
The project SHALL include integration tests for: toggle keybindings (`v`, `w`, `r`, `d`, `?`), file-load overlay, navigation (`j`, `k`, `Tab`), search (`/`, `n`, `N`), reload (`R`), and edge-jump (`g`, `G`, `0`, `$`).

#### Scenario: Toggle keybinding tests exist
- **WHEN** `test/integration/toggles.test.tsx` is examined
- **THEN** it SHALL include tests for `v`, `w`, `r`, `d`, `?` keybindings

#### Scenario: File-load integration tests exist
- **WHEN** `test/integration/file-load.test.tsx` is examined
- **THEN** it SHALL include tests for overlay open, text input, Enter, and Escape

### Requirement: Shared test helpers
The project SHALL provide shared helper modules under `test/helpers/`:
- `integration.ts` — `renderApp()`, `press()`, `delay()`, `selectedLine()`, `KEY_DELAY_MS`
- `requests.ts` — `makeRequests()`, `createRequest()`, `createResolvedRequest()`
- `responses.ts` — `createMockResponse()`, `longResponse`

TypeScript types in these modules are the authoritative interface specification.

#### Scenario: Helper modules exist and are importable
- **WHEN** a helper module under `test/helpers/` is imported
- **THEN** it SHALL export the documented functions without errors
