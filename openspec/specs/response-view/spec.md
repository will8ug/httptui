# Spec: Response View

## Purpose

Rendering behavior of the response panel: content states (loading, error, empty, response), body formatting display (pretty-print vs raw), verbose header display, and visible-window slicing. Keyboard scrolling and offset state are specified in the **navigation** spec; wrap vs truncate line construction in the **text-wrap** spec; search markers and the search bar in the **response-search** spec.

## Requirements

### Requirement: Loading state display
While a request is in flight, the `ResponseView` component SHALL render a spinner whose static label text is `Sending request` in place of response content.

#### Scenario: Loading state renders the spinner
- **WHEN** `ResponseView` is rendered with `isLoading: true`, `response: null`, and `error: null`
- **THEN** the frame SHALL contain the `Sending request` spinner label

### Requirement: Error state display
When a request fails, the `ResponseView` component SHALL render the error message together with its error code in place of response content.

#### Scenario: Error state renders message and code
- **WHEN** `ResponseView` is rendered with `error` set and `response: null`
- **THEN** the frame SHALL contain the error message and its code

### Requirement: Empty state prompt
When no request has been sent yet (no response, no error, not loading), the `ResponseView` component SHALL render the prompt `Press Enter to send a request`.

#### Scenario: Empty state renders the prompt
- **WHEN** `ResponseView` is rendered with `response: null`, `error: null`, and `isLoading: false`
- **THEN** the frame SHALL contain `Press Enter to send a request`

### Requirement: Response body formatting display
With `rawMode` off, the response panel SHALL display the body as produced by `formatResponseBody(response.body, false)` — JSON bodies pretty-printed across multiple indented lines. With `rawMode` on, the response panel SHALL display the body in its raw, unformatted form. (Search-match computation against the same formatted/raw text is specified in the **response-search** spec.)

#### Scenario: JSON body is pretty-printed by default
- **WHEN** `ResponseView` is rendered with a JSON-body response and `rawMode: false`
- **THEN** the frame SHALL contain the formatted (multi-line, indented) body

#### Scenario: Raw mode bypasses formatting
- **WHEN** `ResponseView` is rendered with a JSON-body response and `rawMode: true`
- **THEN** the frame SHALL contain the body in its raw single-line form

### Requirement: Verbose mode header display
When `verbose` is on, the response panel SHALL render the response's header lines between the status line and the body. When `verbose` is off, header lines SHALL NOT be rendered.

#### Scenario: Verbose mode shows response headers
- **WHEN** `ResponseView` is rendered with `verbose: true` and a response carrying headers
- **THEN** the frame SHALL contain the response header lines

### Requirement: Visible window slicing
The `ResponseView` component SHALL render only the slice of visual lines within the current vertical scroll window: lines before `scrollOffset` and lines beyond the visible height SHALL NOT appear in the frame. (How `scrollOffset` changes — keys, clamping, edge jumps — is specified in the **navigation** spec; wrap-vs-truncate line construction is specified in the **text-wrap** spec.)

#### Scenario: Vertical scroll slices the visible window
- **WHEN** `ResponseView` is rendered with a multi-line response, a non-zero `scrollOffset`, and a small `availableHeight`
- **THEN** the frame SHALL contain only lines within the visible slice and omit lines outside it
