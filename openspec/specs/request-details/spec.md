# Spec: Request Details Panel

## Purpose

A toggleable panel showing resolved request details (method, URL, headers, body) for the currently selected request, with full keyboard navigation: toggle, focus cycling, vertical and horizontal scrolling, and scroll position indicators.

## Requirements

### Requirement: Toggle request details panel visibility
The system SHALL provide a toggleable panel that shows or hides request details for the currently selected request. Pressing the `d` key SHALL toggle the panel visibility. The panel SHALL be hidden by default when the application starts.

#### Scenario: Show request details panel
- **WHEN** the user presses `d` and the request details panel is hidden
- **THEN** the system SHALL display the request details panel above the response view

#### Scenario: Hide request details panel
- **WHEN** the user presses `d` and the request details panel is visible
- **THEN** the system SHALL hide the request details panel and restore the response view to its full height

#### Scenario: Default state on app start
- **WHEN** the application starts
- **THEN** the request details panel SHALL be hidden

### Requirement: Display resolved request details
The request details panel SHALL display the fully resolved request for the currently selected request, including: HTTP method, resolved URL (with all `{{variable}}` substitutions applied), resolved headers, and resolved body (if present). Variable resolution SHALL use the same `resolveVariables()` function that is used when sending requests.

#### Scenario: Display request with variables resolved
- **WHEN** the request details panel is visible and the selected request contains `{{baseUrl}}` in the URL and `{{$dotenv API_KEY}}` in headers
- **THEN** the panel SHALL show the URL with `baseUrl` substituted and the header with the env variable value substituted

#### Scenario: Display request with no body
- **WHEN** the selected request is a GET request with no body
- **THEN** the panel SHALL display the method and URL, and omit the body section entirely

#### Scenario: Display request with body
- **WHEN** the selected request has a body (e.g., POST with JSON payload)
- **THEN** the panel SHALL display the request body after the method, URL, and headers sections

### Requirement: Request details panel layout
The request details panel SHALL appear inside the right panel column, above the response view. When visible, the right column SHALL be a vertical flex container with the request details on top and the response view below. The panel height SHALL be content-driven (adapting to number of content lines) with a maximum of `maxContentLines` rows of content. The height calculation SHALL use `min(totalContentLines, maxContentLines) + BORDER_ROWS`, matching the slice-based rendering model used by the component.

#### Scenario: Panel height matches rendered content
- **WHEN** the request details panel is visible
- **THEN** the panel height allocated by Layout SHALL equal `min(totalContentLines, maxContentLines) + BORDER_ROWS`, where `totalContentLines` is the full count of title, method/URL, separators, headers, and body lines

#### Scenario: Panel height stable during scrolling
- **WHEN** the user scrolls the details panel
- **THEN** the panel height SHALL not change — the Layout allocation is based on total content and max, not on the current scroll offset

### Requirement: Visual styling of request details panel
The request details panel SHALL use visual styling consistent with the existing application: a bordered box with the method displayed in an HTTP-method-appropriate color, the URL in a distinct color, headers in gray, and a horizontal separator between sections. The border and title color SHALL reflect focus state: `cyanBright` when focused, `gray` when unfocused.

#### Scenario: Method and URL are colorized
- **WHEN** the request details panel displays a request
- **THEN** the HTTP method SHALL be displayed in a method-appropriate color (e.g., green for GET, yellow for POST) and the URL SHALL be displayed in a visible distinct color

#### Scenario: Headers are styled
- **WHEN** the request details panel displays headers
- **THEN** header names SHALL be visually distinct from header values, both displayed in subdued coloring similar to the response view's header style

#### Scenario: Focused border styling
- **WHEN** the details panel has focus (`focusedPanel === 'details'`)
- **THEN** the panel border and title SHALL use `cyanBright` color

#### Scenario: Unfocused border styling
- **WHEN** the details panel does not have focus
- **THEN** the panel border and title SHALL use `gray` color

### Requirement: Details panel focus via Tab cycling
The request details panel SHALL participate in the Tab focus cycle as a focusable panel. The `FocusedPanel` type SHALL be expanded to include `'details'` alongside `'requests'` and `'response'`. When `showRequestDetails` is true, Tab SHALL cycle: `requests → details → response → requests`. When `showRequestDetails` is false, Tab SHALL skip `'details'`: `requests → response → requests`.

#### Scenario: Tab from requests to details when panel is visible
- **WHEN** `showRequestDetails` is true and `focusedPanel` is `requests` and the user presses Tab
- **THEN** `focusedPanel` SHALL become `'details'`

#### Scenario: Tab from details to response
- **WHEN** `focusedPanel` is `details` and the user presses Tab
- **THEN** `focusedPanel` SHALL become `'response'`

#### Scenario: Tab from response wraps to requests
- **WHEN** `focusedPanel` is `response` and the user presses Tab
- **THEN** `focusedPanel` SHALL become `'requests'`

#### Scenario: Tab skips details when panel is hidden
- **WHEN** `showRequestDetails` is false and `focusedPanel` is `requests` and the user presses Tab
- **THEN** `focusedPanel` SHALL become `'response'` (skipping `'details'`)

### Requirement: Focus transitions on details panel toggle
When the details panel is toggled off while it has focus, the system SHALL move focus to the response panel. When the details panel is toggled on, focus SHALL remain on the current panel (the user must Tab to details intentionally).

#### Scenario: Toggle off while details focused
- **WHEN** `focusedPanel` is `details` and the user presses `d` to hide the details panel
- **THEN** `focusedPanel` SHALL become `'response'` and `showRequestDetails` SHALL become false

#### Scenario: Toggle on does not change focus
- **WHEN** `focusedPanel` is `requests` and the user presses `d` to show the details panel
- **THEN** `focusedPanel` SHALL remain `'requests'` and `showRequestDetails` SHALL become true

### Requirement: Vertical scrolling in request details panel
The request details panel SHALL support vertical scrolling when the panel is focused and the resolved request content (method line, URL, headers, body) exceeds the panel's visible height. Scrolling SHALL use `j/k` and `↑/↓` keys. The scroll offset SHALL be tracked as `detailsScrollOffset` in `AppState`. The scroll offset SHALL be clamped to `[0, maxOffset]` at the reducer level, where `maxOffset = Math.max(0, totalLines - visibleHeight)`. The `SCROLL` action for the details panel SHALL include a `maxOffset` payload computed in the component layer. The scroll offset SHALL never accumulate past the upper boundary — pressing `j` at the bottom SHALL be a no-op for the offset value.

#### Scenario: Scroll down through long request body
- **WHEN** `focusedPanel` is `details` and the resolved request body has more lines than the visible height, and the user presses `j` or `↓`
- **THEN** the panel content SHALL scroll down by one line, revealing hidden content below

#### Scenario: Scroll offset clamped at bottom
- **WHEN** `focusedPanel` is `details` and the details scroll offset is at the maximum value (`maxOffset = totalLines - visibleHeight`) and the user presses `j` or `↓`
- **THEN** the scroll offset SHALL remain at `maxOffset` (it SHALL NOT increase beyond `maxOffset`)

#### Scenario: Immediate upward scroll after bottoming out
- **WHEN** `focusedPanel` is `details` and the scroll offset is at `maxOffset`, the user presses `j` three extra times, then presses `k`
- **THEN** the scroll offset SHALL decrease by 1 from `maxOffset` (the user SHALL NOT need to "work off" the excess presses)

#### Scenario: Panel height remains stable during scrolling
- **WHEN** the user scrolls through the details panel content
- **THEN** the panel height SHALL remain constant regardless of the scroll offset — the visible line count SHALL never change for a given request

### Requirement: Horizontal scrolling in request details panel
The request details panel SHALL support horizontal scrolling when the panel is focused, using `h/l` and `←/→` keys. The horizontal offset SHALL be tracked as `detailsHorizontalOffset` in `AppState`. When rendering with a non-zero horizontal offset, the panel SHALL slice each line of text by the offset and truncate the result to fit within the panel's available content width. The rendered text SHALL NOT extend beyond the panel's bounds into adjacent UI areas.

#### Scenario: Scroll right to see long URL without overflow
- **WHEN** `focusedPanel` is `details` and the resolved URL exceeds the panel width, and the user presses `l` or `→`
- **THEN** the panel content SHALL shift left, revealing hidden content to the right, AND the visible text SHALL be truncated to fit within the panel's content width

#### Scenario: Scroll left after scrolling right
- **WHEN** `focusedPanel` is `details` and the user has scrolled right and presses `h` or `←`
- **THEN** the panel content SHALL shift right

#### Scenario: Horizontal offset clamped at zero
- **WHEN** `focusedPanel` is `details` and the horizontal offset is 0 and the user presses `h` or `←`
- **THEN** the horizontal offset SHALL remain at 0

#### Scenario: No visual overflow during horizontal scroll
- **WHEN** `focusedPanel` is `details` and a request has very long lines (URL, headers, or body), and the user scrolls horizontally
- **THEN** NO content SHALL render outside the panel's right-column bounds, and NO content SHALL overlap the requests sidebar on the left

### Requirement: Details scroll offset reset on state transitions
Both `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0 on the following state transitions: toggling the details panel off (`TOGGLE_REQUEST_DETAILS` when hiding), changing the selected request (`MOVE_SELECTION`, `SELECT_REQUEST`), reloading the file (`RELOAD_FILE`), and loading a new file (`LOAD_FILE`).

#### Scenario: Reset on toggle off
- **WHEN** the user presses `d` to hide the details panel
- **THEN** `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0

#### Scenario: Reset on selection change
- **WHEN** the user moves to a different request with `k` or `j` (while request list is focused)
- **THEN** `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0

#### Scenario: Reset on file reload
- **WHEN** the user presses `R` to reload
- **THEN** `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0

#### Scenario: Reset on file load
- **WHEN** the user loads a new file via `o`
- **THEN** `detailsScrollOffset` and `detailsHorizontalOffset` SHALL be reset to 0

### Requirement: Scroll position indicator
When the request details panel content exceeds the visible height, the panel SHALL display a scroll position indicator showing the user's position within the content.

#### Scenario: Indicator shown when content overflows
- **WHEN** the details panel has more content lines than the visible window
- **THEN** the panel SHALL display an indicator in dim text showing current scroll position relative to total lines (e.g., `↕ 1/25 lines`)

#### Scenario: Indicator hidden when content fits
- **WHEN** the details panel content fits entirely within the visible height
- **THEN** no scroll position indicator SHALL be displayed

### Requirement: Enter sends request regardless of focused panel
The `Enter` key SHALL send the currently selected request regardless of which panel has focus. This existing behavior SHALL be preserved with the addition of the `'details'` focus state.

#### Scenario: Enter sends request when details focused
- **WHEN** `focusedPanel` is `details` and the user presses Enter
- **THEN** the system SHALL send the currently selected request

## MODIFIED Requirements (refactor-test-reducer-extraction)

### Requirement: Details panel scroll tests use real reducer
The test file `test/details-scroll.test.ts` SHALL import `reducer` and `createInitialState` from `src/core/reducer.ts` instead of defining local copies. The local `reducer` function, `createInitialState` function, `getVisibleRequestOffset` function, and any other logic duplicated from `src/app.tsx` SHALL be removed from the test file. All test assertions SHALL produce the same results as before (or reveal previously-masked bugs that should be fixed).

#### Scenario: details-scroll test imports real reducer
- **WHEN** `test/details-scroll.test.ts` is examined after the refactor
- **THEN** it SHALL contain `import { reducer, createInitialState } from '../src/core/reducer'` and SHALL NOT contain a local `function reducer` or `function createInitialState`

#### Scenario: details-scroll tests pass with real reducer
- **WHEN** `npm test -- details-scroll` is run
- **THEN** all tests SHALL pass (behavior preserved or bugs fixed)
