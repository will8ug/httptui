## MODIFIED Requirements

### Requirement: Search state cleared on response change
All search state (`searchQuery`, `searchMatches`, `currentMatchIndex`, `lastSearchQuery`) SHALL be cleared when a new request is sent (`SEND_REQUEST`), a new response is received (`RECEIVE_RESPONSE`), a request error occurs (`REQUEST_ERROR`), a file reload error occurs (`RELOAD_ERROR`), a different request is selected (`SELECT_REQUEST`, `MOVE_SELECTION`), or raw mode is toggled (`TOGGLE_RAW`).

#### Scenario: New request clears search
- **WHEN** the user sends a new request while search matches are active
- **THEN** all search state SHALL be cleared

#### Scenario: Selecting different request clears search
- **WHEN** the user selects a different request while search matches are active
- **THEN** all search state SHALL be cleared

#### Scenario: Toggling raw mode clears search
- **WHEN** the user toggles raw mode while search matches are active
- **THEN** all search state SHALL be cleared
