# Spec Delta: response-view

## MODIFIED Requirements

### Requirement: Empty state prompt
When there is no response to display — no response, no error, and no request in flight — the `ResponseView` component SHALL render the prompt `Press Enter to send a request`. A cancelled request ends in this state rather than restoring the response that preceded it. (The cancelled-request acknowledgment in the status bar is specified in the **status-bar** spec.)

#### Scenario: Empty state renders the prompt
- **WHEN** `ResponseView` is rendered with `response: null`, `error: null`, and `isLoading: false`
- **THEN** the frame SHALL contain `Press Enter to send a request`

#### Scenario: Cancelled request leaves the empty prompt
- **WHEN** a response has been displayed, a new request is sent, and the in-flight request is cancelled with `Escape`
- **THEN** the response pane SHALL show `Press Enter to send a request`
- **AND** the response pane SHALL NOT show the previous response body
