## ADDED Requirements

### Requirement: Shared integration test helpers
The system SHALL provide `test/helpers/integration.ts` exporting the following utilities for use by integration tests:

- `renderApp(overrides?: Partial<AppProps>)` — renders `<App>` via `ink-testing-library`'s `render()` with test-friendly default `AppProps` (empty variables, `insecure: false`, `filePath: 'test.http'`), allowing individual test files to override `requests` and other props.
- `press(stdin, key)` — asynchronously writes a key sequence to the `stdin` stream with a leading and trailing `delay(KEY_DELAY_MS)` to allow React/Ink to process the input.
- `delay(ms: number): Promise<void>` — resolves after the specified milliseconds.
- `selectedLine(frame: string): string` — extracts the line in a rendered frame containing the selection marker (`▸`).
- `KEY_DELAY_MS: number` — the default delay between keypresses (currently 50ms).

#### Scenario: Integration tests import shared helpers
- **WHEN** an integration test file under `test/integration/` is examined
- **THEN** it SHALL import `renderApp`, `press`, `delay`, and/or `selectedLine` from `../helpers/integration` instead of defining them inline

#### Scenario: renderApp uses defaults when no overrides provided
- **WHEN** `renderApp()` is called with no arguments
- **THEN** the returned render result SHALL have rendered `<App>` with empty `requests`, empty `variables`, `filePath: 'test.http'`, and `insecure: false`

#### Scenario: renderApp accepts prop overrides
- **WHEN** `renderApp({ requests: myRequests })` is called
- **THEN** the returned render result SHALL have rendered `<App>` with the provided requests and default values for all other props

### Requirement: Existing edge-jump integration test uses shared helpers
The existing integration test file (moved to `test/integration/edge-jump.test.tsx` from `test/edge-jump-integration.test.tsx`) SHALL import and use the shared integration helpers instead of defining them inline. The local `renderApp`, `press`, `delay`, `selectedLine`, `makeShortUrlRequests`, and `makeLongUrlRequests` functions SHALL be replaced by imports from `../helpers/integration` and `../helpers/requests`.

#### Scenario: edge-jump integration test imports shared helpers
- **WHEN** `test/integration/edge-jump.test.tsx` is examined
- **THEN** it SHALL NOT contain local definitions of `renderApp`, `press`, `delay`, or `selectedLine`
- **AND** it SHALL import these from `../helpers/integration`