## MODIFIED Requirements

### Requirement: Loading state display
While a request is in flight, the `ResponseView` component SHALL render a spinner whose static label text is `Sending request` in place of response content, accompanied by a hint that the request can be canceled with `Escape`.

#### Scenario: Loading state renders the spinner
- **WHEN** `ResponseView` is rendered with `isLoading: true`, `response: null`, and `error: null`
- **THEN** the frame SHALL contain the `Sending request` spinner label
- **AND** the frame SHALL contain an `(Esc to cancel)` hint
