## MODIFIED Requirements

### Requirement: Escape key handling in normal mode
In addition to existing Escape behaviors (close help overlay, cancel file load, cancel search, clear search results), the system SHALL handle Escape to cancel an in-flight request and to exit fullscreen mode. When the application is in normal mode and a request is in flight, pressing `Escape` SHALL cancel the in-flight request (see the **request-cancel** spec). When the application is in normal mode, no request is in flight, and `maximizedPanel` is not `null`, pressing `Escape` SHALL dispatch `TOGGLE_FULLSCREEN`.

The full Escape priority chain in `useInput` SHALL be:
1. Help overlay open → dispatch `CLOSE_HELP`
2. File load mode → dispatch `CANCEL_FILE_LOAD`
3. Search mode → dispatch `CANCEL_SEARCH`
4. Normal mode with a request in flight → cancel the in-flight request
5. Normal mode with `maximizedPanel` not `null` → dispatch `TOGGLE_FULLSCREEN`
6. Normal mode with active search results → dispatch `CANCEL_SEARCH`

#### Scenario: Escape exits fullscreen in normal mode
- **WHEN** `maximizedPanel` is `'response'`, no request is in flight, and the user presses `Escape` in normal mode with no overlays
- **THEN** a `TOGGLE_FULLSCREEN` action SHALL be dispatched and fullscreen SHALL be exited

#### Scenario: Escape while loading cancels the request instead of exiting fullscreen
- **WHEN** `maximizedPanel` is `'response'`, a request is in flight, and the user presses `Escape` in normal mode
- **THEN** the in-flight request SHALL be canceled and fullscreen SHALL remain active
