## ADDED Requirements

### Requirement: ResponseView component tests
The test suite SHALL include direct ink-testing-library component tests for `ResponseView` (`test/components/ResponseView.test.tsx`) covering its content states, display modes, scroll/slicing behavior, and search rendering — the behaviors that integration tests cannot reach with precise prop control. Tests SHALL follow the established pattern (`render()` from ink-testing-library, `lastFrame() ?? ''`, `toContain`/`not.toContain` assertions, `afterEach(cleanup)`) and reuse `createMockResponse`/`longResponse`/`compactJsonResponse` from `test/helpers/responses.ts`. Tests SHALL NOT mock `formatResponseBody` or `computeResponseLayout`.

#### Scenario: Loading state renders the spinner
- **WHEN** `ResponseView` is rendered with `isLoading: true`, `response: null`, and `error: null`
- **THEN** the frame contains the `Sending request` spinner label

#### Scenario: Error state renders message and code
- **WHEN** `ResponseView` is rendered with `error` set and `response: null`
- **THEN** the frame contains the error message and its code

#### Scenario: Empty state renders the prompt
- **WHEN** `ResponseView` is rendered with `response: null`, `error: null`, and `isLoading: false`
- **THEN** the frame contains `Press Enter to send a request`

#### Scenario: JSON body is pretty-printed by default
- **WHEN** `ResponseView` is rendered with a JSON-body response and `rawMode: false`
- **THEN** the frame contains the formatted (multi-line, indented) body

#### Scenario: Raw mode bypasses formatting
- **WHEN** `ResponseView` is rendered with a JSON-body response and `rawMode: true`
- **THEN** the frame contains the body in its raw single-line form

#### Scenario: Verbose mode shows response headers
- **WHEN** `ResponseView` is rendered with `verbose: true` and a response carrying headers
- **THEN** the frame contains the response header lines

#### Scenario: Vertical scroll slices the visible window
- **WHEN** `ResponseView` is rendered with a multi-line response, a non-zero `scrollOffset`, and a small `availableHeight`
- **THEN** the frame contains only lines within the visible slice and omits lines outside it

#### Scenario: Horizontal offset shifts content in nowrap mode
- **WHEN** `ResponseView` is rendered with `wrapMode: 'nowrap'` and `horizontalOffset` greater than zero
- **THEN** long lines appear shifted left by the offset (leading characters are not visible)

#### Scenario: Nowrap truncates long lines at the content width
- **WHEN** `ResponseView` is rendered with `wrapMode: 'nowrap'`, a long-line response, and a pinned `contentWidthOverride`
- **THEN** long lines are truncated at the content width

#### Scenario: Wrap mode wraps instead of truncating
- **WHEN** `ResponseView` is rendered with `wrapMode: 'wrap'`, a long-line response, and a pinned `contentWidthOverride`
- **THEN** long content continues on subsequent visual lines instead of being truncated

#### Scenario: Current search match is marked
- **WHEN** `ResponseView` is rendered with `searchMatches` and `currentMatchIndex` set
- **THEN** the visual line containing the current match carries the `►` marker

#### Scenario: Other search matches are marked
- **WHEN** `ResponseView` is rendered with multiple `searchMatches`
- **THEN** non-current match lines within the visible slice carry the `·` marker

#### Scenario: Search bar shows the query while typing
- **WHEN** `ResponseView` is rendered with `isSearchMode: true` and a `searchQuery`
- **THEN** the search bar line shows `/` followed by the query

#### Scenario: Search bar shows match position after search
- **WHEN** `ResponseView` is rendered with `isSearchMode: false`, a `lastSearchQuery`, and non-empty `searchMatches`
- **THEN** the search bar shows the current position over total matches (e.g. `[1/3]`)

#### Scenario: Search bar reports no matches
- **WHEN** `ResponseView` is rendered with a `lastSearchQuery` and empty `searchMatches`
- **THEN** the search bar indicates there are no matches

### Requirement: RequestDetailsView component tests
The test suite SHALL include direct ink-testing-library component tests for `RequestDetailsView` (`test/components/RequestDetailsView.test.tsx`) covering its section rendering, empty-section omission, and overflow/scroll behavior. Tests SHALL reuse `createRequest` from `test/helpers/requests.ts` and follow the established component-test pattern.

#### Scenario: Title and request line are rendered
- **WHEN** `RequestDetailsView` is rendered with a request
- **THEN** the frame contains the `Request Details` title, the method, and the resolved URL

#### Scenario: Variables in the URL are resolved
- **WHEN** `RequestDetailsView` is rendered with a `{{variable}}` URL and matching `variables`
- **THEN** the frame contains the resolved value and not the `{{...}}` placeholder

#### Scenario: Headers are rendered as name-value lines
- **WHEN** `RequestDetailsView` is rendered with a request carrying headers
- **THEN** the frame contains each `name: value` header line

#### Scenario: Formdata fields are rendered
- **WHEN** `RequestDetailsView` is rendered with a request carrying `formdataFields`
- **THEN** the frame contains each formdata field line

#### Scenario: Body is rendered
- **WHEN** `RequestDetailsView` is rendered with a request carrying a body
- **THEN** the frame contains the body content

#### Scenario: Empty sections are omitted
- **WHEN** `RequestDetailsView` is rendered with a request that has no headers and no body
- **THEN** the frame contains the request line without header or body lines

#### Scenario: Long content is truncated at the content width
- **WHEN** `RequestDetailsView` is rendered with a long URL or body and a pinned `contentWidthOverride`
- **THEN** the line is truncated at the content width

#### Scenario: Horizontal offset shifts content
- **WHEN** `RequestDetailsView` is rendered with `horizontalOffset` greater than zero
- **THEN** shiftable lines appear shifted left by the offset

#### Scenario: Vertical scroll slices the visible window
- **WHEN** `RequestDetailsView` is rendered with content exceeding `maxHeight` and a non-zero `scrollOffset`
- **THEN** the frame contains only lines within the visible slice

### Requirement: StatusBar component tests
The test suite SHALL include direct ink-testing-library component tests for `StatusBar` (`test/components/StatusBar.test.tsx`) covering the shortcut bar, per-panel status text, and the conditional transient/env/INSECURE indicators. Tests SHALL follow the established component-test pattern.

#### Scenario: Shortcut bar is rendered
- **WHEN** `StatusBar` is rendered
- **THEN** the frame contains the keybinding hints marked for the bar (e.g. `[Enter] Send`)

#### Scenario: Requests-focus status shows selection position
- **WHEN** `StatusBar` is rendered with `focusedPanel: 'requests'`
- **THEN** the status text shows the file name and `selectedIndex + 1` over `requestCount` (e.g. `1/3`)

#### Scenario: Details-focus status shows line position
- **WHEN** `StatusBar` is rendered with `focusedPanel: 'details'`
- **THEN** the status text shows the scroll position over `detailsTotalLines`

#### Scenario: Response-focus status shows line position
- **WHEN** `StatusBar` is rendered with `focusedPanel: 'response'` and `hasResponse: true`
- **THEN** the status text shows the scroll position over `responseTotalLines`

#### Scenario: Response-focus status without a response omits line position
- **WHEN** `StatusBar` is rendered with `focusedPanel: 'response'` and `hasResponse: false`
- **THEN** the status text shows only the file name with no line-position indicator

#### Scenario: Transient message is shown when set
- **WHEN** `StatusBar` is rendered with a non-null `transientMessage`
- **THEN** the frame contains the transient message text

#### Scenario: Transient message is hidden when null
- **WHEN** `StatusBar` is rendered with `transientMessage: null`
- **THEN** the frame contains no transient message

#### Scenario: Environment name is shown when set
- **WHEN** `StatusBar` is rendered with a non-null `envName`
- **THEN** the frame contains the environment name

#### Scenario: INSECURE indicator is shown only in insecure mode
- **WHEN** `StatusBar` is rendered with `insecure: true`
- **THEN** the frame contains `INSECURE`; and when rendered with `insecure: false` it does not
