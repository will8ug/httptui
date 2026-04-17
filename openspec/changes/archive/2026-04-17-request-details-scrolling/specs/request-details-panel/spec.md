## MODIFIED Requirements

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
