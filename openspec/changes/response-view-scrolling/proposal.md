## Why

The request details panel currently truncates content with an ellipsis when headers and body exceed the ~10-row maximum height. For requests with many headers or large JSON bodies, users cannot see the full resolved request without sending it and viewing the response. Adding vertical scrolling to the details panel brings it in line with the response panel's scroll behavior and makes the details view actually useful for inspecting long requests before sending.

## What Changes

- Add vertical scroll offset tracking for the request details panel (`detailsScrollOffset` in AppState)
- Extend the existing `SCROLL` reducer action to handle the details panel when it is visible and the response panel is focused (or add panel-aware scroll routing)
- Update `RequestDetailsView` to accept a scroll offset and render a visible window of content (slice-based, matching the pattern used by `ResponseView` and `RequestList`)
- Replace the truncation ellipsis with proper scroll-based content windowing
- Reset details scroll offset when toggling the panel off, changing selected request, or reloading/loading files

## Capabilities

### New Capabilities
- `details-panel-scrolling`: Vertical scrolling within the request details panel, allowing users to navigate through headers and body content that exceeds the panel's visible height

### Modified Capabilities
- `request-details-panel`: The panel layout requirement changes from "truncate with ellipsis" to "scroll through content with up/down keys"

## Impact

- **State**: New `detailsScrollOffset: number` field in `AppState` interface and initial state
- **Reducer**: Extended `SCROLL` action handling (or new action) to update details offset; reset logic in `TOGGLE_REQUEST_DETAILS`, `MOVE_SELECTION`, `SELECT_REQUEST`, `RELOAD_FILE`, `LOAD_FILE`
- **Components**: `RequestDetailsView` props gain `scrollOffset`; internal rendering changes from truncation to slice-based windowing
- **Key handling**: No new keys required — existing `j/k`/arrows already dispatch `SCROLL` when response panel is focused; scroll routing needs to target details panel when it's visible
- **Tests**: Existing reducer and detail-panel tests need updates for new state field and scroll behavior
