## ADDED Requirements

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
The request details panel SHALL appear inside the right panel column, above the response view. When visible, the right column SHALL be a vertical flex container with the request details on top and the response view below. The panel height SHALL be content-driven (adapting to number of headers/body lines) with a maximum of approximately 10 rows. When content exceeds the visible height, the panel SHALL support vertical scrolling instead of truncating with an ellipsis. The panel SHALL participate in the Tab focus cycle and display focus-aware border styling.

#### Scenario: Panel appears above response view
- **WHEN** the user toggles the request details panel on
- **THEN** the panel SHALL render at the top of the right column, pushing the response view downward

#### Scenario: Long request body is scrollable
- **WHEN** the resolved request body exceeds the panel's maximum visible height and the panel is focused
- **THEN** the panel SHALL allow the user to scroll through the content using `j/k` or `↑/↓` keys, and SHALL display a scroll position indicator

#### Scenario: Panel hidden restores full response view
- **WHEN** the user toggles the request details panel off
- **THEN** the response view SHALL expand to occupy the full right column height

### Requirement: Keyboard shortcut for request details
The system SHALL register `d` as the keyboard shortcut for toggling the request details panel. The shortcut SHALL appear in the help overlay but SHALL NOT appear in the compact status bar at the bottom of the screen.

#### Scenario: Press d to toggle
- **WHEN** the user presses `d` in normal mode
- **THEN** the system SHALL toggle the `showRequestDetails` state

#### Scenario: Shortcut visible in help overlay
- **WHEN** the user opens the help overlay with `?`
- **THEN** the shortcut `d` for request details SHALL be listed with a description

#### Scenario: Shortcut hidden from status bar
- **WHEN** the status bar is rendered at the bottom of the screen
- **THEN** the `d` shortcut SHALL NOT appear in the status bar shortcuts

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