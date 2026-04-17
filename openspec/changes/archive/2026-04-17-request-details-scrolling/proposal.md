## Why

The request details panel currently truncates content with an ellipsis when headers and body exceed the ~10-row maximum height. For requests with many headers or large JSON bodies, users cannot see the full resolved request without sending it and viewing the response. Adding scrolling to the details panel and making it a proper focusable panel brings it in line with how the request list and response panels work.

## What Changes

- Expand `FocusedPanel` from a 2-value union (`'requests' | 'response'`) to a 3-value union (`'requests' | 'details' | 'response'`), making the details panel a first-class focusable panel
- Update Tab cycling (`SWITCH_PANEL`) to include the details panel when `showRequestDetails` is true: `requests → details → response → requests`
- Add vertical and horizontal scroll offset tracking for the details panel (`detailsScrollOffset`, `detailsHorizontalOffset` in AppState)
- Extend `SCROLL` and `SCROLL_HORIZONTAL` reducer actions with a `'details'` branch based on `focusedPanel`
- Update `RequestDetailsView` to accept scroll offsets and a `focused` prop, rendering a visible window of content with focus-aware border styling
- Replace the truncation ellipsis with proper scroll-based content windowing
- Reset details scroll offsets on natural boundaries (toggle off, change selection, reload, focus away from details when panel hidden)

## Capabilities

### New Capabilities
- `details-panel-scrolling`: Vertical and horizontal scrolling within the request details panel, with Tab-based focus cycling to select the panel before scrolling

### Modified Capabilities
- `request-details-panel`: The panel becomes a focusable panel participating in the Tab cycle; layout changes from "truncate with ellipsis" to "scroll through content with j/k and h/l keys when focused"
- `tui`: The `FocusedPanel` type expands to three values; `SWITCH_PANEL` becomes a conditional cycle; keyboard shortcut descriptions update to reflect three-panel navigation

## Impact

- **Types**: `FocusedPanel` gains `'details'` value; `AppState` gains `detailsScrollOffset` and `detailsHorizontalOffset`
- **Reducer**: `SWITCH_PANEL` becomes conditional 3-way cycle; `SCROLL` and `SCROLL_HORIZONTAL` gain `'details'` branches; `TOGGLE_REQUEST_DETAILS` moves focus to `'response'` when hiding the details panel while it's focused; reset logic in `MOVE_SELECTION`, `SELECT_REQUEST`, `RELOAD_FILE`, `LOAD_FILE`
- **Components**: `RequestDetailsView` gains `focused`, `scrollOffset`, `horizontalOffset` props; border and title color become focus-aware (`cyanBright`/`gray`)
- **Key handling**: No new keys — `j/k`, `h/l`, `Enter`, `Tab` all work as before, just with a third panel in the routing
- **Tests**: Test fixtures constructing `AppState` need new fields; new reducer tests for 3-way Tab cycle, details scroll, and focus transitions
