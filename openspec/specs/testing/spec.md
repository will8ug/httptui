# Spec: Testing

## Purpose

Testing infrastructure for httptui: test directory structure, three-tier test classification, shared factories and fixtures, integration test helpers, and coverage expectations.

## Requirements

### Requirement: Integration test directory
Integration tests SHALL live under `test/integration/`. Each file SHALL have `.test.tsx` extension and SHALL render the real `<App>` component via `ink-testing-library`. The existing file `test/edge-jump-integration.test.tsx` SHALL be moved to `test/integration/edge-jump.test.tsx` as part of this change.

#### Scenario: Vitest discovers integration tests
- **WHEN** `npm test` is run
- **THEN** files matching `test/integration/**/*.test.tsx` SHALL be discovered and executed by Vitest without additional config changes

#### Scenario: Integration tests render real App
- **WHEN** an integration test file is examined
- **THEN** it SHALL import `{ App }` from `../../src/app` and render it via `ink-testing-library`'s `render()` function

### Requirement: Toggle keybinding integration tests
The system SHALL include integration tests for toggle keybindings (`v`, `w`, `r`, `d`, `?`) at `test/integration/toggles.test.tsx`. Each test SHALL render `<App>`, send the key via `stdin.write`, and assert the rendered frame reflects the expected state change.

#### Scenario: Verbose toggle visible in rendered output
- **WHEN** the user presses `v` in normal mode
- **THEN** subsequent rendered frames SHALL reflect verbose mode (e.g., response headers visible when a response is present, or a visible state indicator in the status bar)

#### Scenario: Wrap toggle visible in rendered output
- **WHEN** the user presses `w` in normal mode
- **THEN** subsequent rendered frames SHALL reflect the wrap mode change (content rewrapping, or a visible wrap-mode indicator)

#### Scenario: Raw toggle visible in rendered output
- **WHEN** the user presses `r` in normal mode with a JSON response loaded
- **THEN** subsequent rendered frames SHALL reflect the raw-mode change (JSON formatting toggled)

#### Scenario: Details panel toggle visible in rendered output
- **WHEN** the user presses `d` in normal mode
- **THEN** subsequent rendered frames SHALL show or hide the details panel accordingly

#### Scenario: Help overlay opens on `?` and closes on `Esc` or `?`
- **WHEN** the user presses `?` in normal mode
- **THEN** the rendered frame SHALL include help overlay content (keybinding descriptions)
- **WHEN** the user then presses `Esc` or `?` again
- **THEN** the rendered frame SHALL no longer include the help overlay

### Requirement: File-load overlay integration tests
The system SHALL include integration tests for the file-load overlay (`o`, text input, `Enter`, `Esc`) at `test/integration/file-load.test.tsx`.

#### Scenario: File-load overlay opens on `o`
- **WHEN** the user presses `o` in normal mode
- **THEN** the rendered frame SHALL display the file-load overlay with an input field

#### Scenario: Text input accumulates in overlay
- **WHEN** the file-load overlay is open and the user types characters
- **THEN** the rendered frame SHALL show the accumulated input text

#### Scenario: Invalid file path shows error
- **WHEN** the file-load overlay is open, the user enters a path that does not exist, and presses `Enter`
- **THEN** the rendered frame SHALL show an error message

#### Scenario: Escape cancels file-load overlay
- **WHEN** the file-load overlay is open and the user presses `Esc`
- **THEN** the rendered frame SHALL return to normal mode without loading

### Requirement: Reload keybinding integration tests
The system SHALL include integration tests for the `R` reload keybinding at `test/integration/reload.test.tsx`. Tests MAY use a temporary `.http` file on disk to exercise the real file-read path.

#### Scenario: Pressing `R` reloads file
- **WHEN** the user presses `R` with a valid file path configured
- **THEN** the rendered frame SHALL briefly display a "Reloaded" message in the status bar

### Requirement: Search integration tests
The system SHALL include integration tests for search keybindings (`/`, text input, `Enter`, `Esc`, `n`, `N`) at `test/integration/search.test.tsx`.

#### Scenario: Search mode activates on `/`
- **WHEN** a response is loaded and the user presses `/`
- **THEN** the rendered frame SHALL display a search input bar

#### Scenario: Search with matches highlights current match
- **WHEN** the user enters a query matching response body lines and presses `Enter`
- **THEN** the rendered frame SHALL display the match count (e.g., `[1/N]`) and a current-match indicator

#### Scenario: `n` advances to next match
- **WHEN** search matches are active and the user presses `n`
- **THEN** the rendered frame SHALL update the current match indicator to the next match

#### Scenario: `Esc` dismisses search state
- **WHEN** search matches are active and the user presses `Esc`
- **THEN** the rendered frame SHALL no longer display match indicators or the search bar

### Requirement: Navigation keybinding integration tests
The system SHALL include integration tests for core navigation keybindings (`j`, `k`, arrows, `Tab`) at `test/integration/navigation.test.tsx`.

#### Scenario: `j` and `k` move selection in requests panel
- **WHEN** the requests panel is focused and the user presses `j` (or the down arrow)
- **THEN** the rendered frame SHALL show the next request selected

#### Scenario: `Tab` cycles focus between panels
- **WHEN** the requests panel is focused and the user presses `Tab`
- **THEN** the rendered frame SHALL show focus moved to the next panel (response or details based on visibility)

### Requirement: Shared state factory
The `test/helpers/state.ts` module SHALL export a `createInitialState` function that re-exports from `src/core/reducer.ts` and provides a test-friendly default. The function SHALL accept an optional `Partial<AppState>` overrides object and SHALL return a fully-populated `AppState` with all 30 fields. The default SHALL use `requests: []`, `variables: []`, `filePath: 'test.http'`, and `insecure: false` as test-friendly defaults, allowing test authors to override only the fields relevant to their test.

#### Scenario: Create state with no overrides
- **WHEN** `createInitialState()` is called with no arguments
- **THEN** the returned `AppState` SHALL contain all 30 fields with sensible defaults (empty `requests`, `variables: []`, `selectedIndex: 0`, `focusedPanel: 'requests'`, etc.)

#### Scenario: Create state with partial overrides
- **WHEN** `createInitialState({ selectedIndex: 3, focusedPanel: 'response' })` is called
- **THEN** the returned `AppState` SHALL have `selectedIndex: 3`, `focusedPanel: 'response'`, and all other fields set to their defaults

#### Scenario: Override includes all search fields
- **WHEN** a test creates state for search testing with `createInitialState({ response: mockResponse, mode: 'search' })`
- **THEN** the returned state SHALL include `searchQuery`, `searchMatches`, `currentMatchIndex`, and `lastSearchQuery` fields (no missing fields)

### Requirement: Shared request factories
The `test/helpers/requests.ts` module SHALL export the following factory functions:

- `makeRequests(count: number, opts?: { longUrl?: boolean }): ParsedRequest[]` — creates an array of `count` requests with sequential names and optional long URLs.
- `createRequest(overrides?: Partial<ParsedRequest>): ParsedRequest` — creates a single `ParsedRequest` with sensible defaults, allowing override of any field.
- `createResolvedRequest(overrides?: Partial<ResolvedRequest>): ResolvedRequest` — creates a single `ResolvedRequest` with sensible defaults, allowing override of any field.

#### Scenario: makeRequests with default URL
- **WHEN** `makeRequests(3)` is called
- **THEN** the result SHALL be an array of 3 `ParsedRequest` objects with sequential names, `method: 'GET'`, and a short default URL

#### Scenario: makeRequests with long URL
- **WHEN** `makeRequests(2, { longUrl: true })` is called
- **THEN** the result SHALL be an array of 2 `ParsedRequest` objects with URLs exceeding typical panel width

#### Scenario: createRequest with overrides
- **WHEN** `createRequest({ method: 'POST', body: '{"name":"test"}' })` is called
- **THEN** the result SHALL be a `ParsedRequest` with `method: 'POST'` and the specified body, with all other fields defaulted

#### Scenario: createResolvedRequest with overrides
- **WHEN** `createResolvedRequest({ url: 'https://example.com/api' })` is called
- **THEN** the result SHALL be a `ResolvedRequest` with the specified URL and default method/headers

### Requirement: Shared response fixtures
The `test/helpers/responses.ts` module SHALL export the following:

- `createMockResponse(overrides?: Partial<ResponseData>): ResponseData` — creates a `ResponseData` object with sensible defaults (status 200, empty body, empty headers).
- `longResponse: ResponseData` — a pre-built fixture with a 200-character body string for scroll/width testing.

#### Scenario: createMockResponse with default values
- **WHEN** `createMockResponse()` is called
- **THEN** the result SHALL be a `ResponseData` with `statusCode: 200`, `statusText: 'OK'`, `headers: {}`, `body: ''`, and valid timing/size fields

#### Scenario: createMockResponse with overrides
- **WHEN** `createMockResponse({ statusCode: 404, body: 'not found' })` is called
- **THEN** the result SHALL override only the specified fields while preserving defaults for all others

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
