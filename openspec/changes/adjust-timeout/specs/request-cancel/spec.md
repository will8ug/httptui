## Purpose

Lets the user abort an in-flight HTTP request from the keyboard instead of waiting for it to finish or fail, making the user — not a hardcoded deadline — the timeout.

## ADDED Requirements

### Requirement: Cancel in-flight request with Escape
In normal mode, when a request is in flight, pressing `Escape` SHALL abort the request and clear the loading state. The cancellation SHALL be reported as a transient warning in the status bar using the existing transient-message mechanism, and SHALL NOT be rendered as a request error. The response panel SHALL return to whatever it displayed before the request was sent: the previously displayed response, if any, SHALL remain in place unchanged.

#### Scenario: Escape cancels a slow request
- **WHEN** a request is in flight (the loading spinner is shown) and the user presses `Escape` in normal mode
- **THEN** the request SHALL be aborted, the loading state SHALL clear, and a transient warning SHALL be displayed in the status bar

#### Scenario: Prior response reappears after cancel
- **WHEN** a response was previously displayed, a new request is sent, and the user presses `Escape` while it is in flight
- **THEN** the previously displayed response SHALL be shown again and no request error SHALL be rendered

#### Scenario: Cancel with no prior response shows the empty prompt
- **WHEN** no response has been received yet and the user cancels an in-flight request
- **THEN** the response panel SHALL display the empty-state prompt

### Requirement: Late responses are discarded after cancellation
When a response or error arrives after the user has canceled the request, it SHALL be discarded: no response content, error message, or loading state SHALL be rendered for the canceled request.

#### Scenario: Response arriving after cancel is not rendered
- **WHEN** the user cancels an in-flight request and the server's response arrives afterwards
- **THEN** the response SHALL NOT be displayed and the transient warning SHALL remain the only visible effect

### Requirement: Escape in other modes does not cancel
While an overlay or input mode is active (help, file load, search, environment select, save, edit, confirmation prompts), `Escape` SHALL retain its existing meaning for that mode and SHALL NOT cancel an in-flight request.

#### Scenario: Escape closes the help overlay without canceling
- **WHEN** a request is in flight and the help overlay is open and the user presses `Escape`
- **THEN** the help overlay SHALL close and the request SHALL continue in flight
