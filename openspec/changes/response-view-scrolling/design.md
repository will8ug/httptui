## Context

The httptui app has a request details panel (`RequestDetailsView`) toggled with `d`. It renders the resolved HTTP method, URL, headers, and body inside a bordered box with a hard cap of ~10 content rows. Content beyond that cap is truncated with an ellipsis ("… (N more lines)"). The response panel and request list both already support vertical scrolling via a `scrollOffset` state field, a `SCROLL` reducer action, and slice-based rendering (`lines.slice(offset, offset + visibleHeight)`).

The details panel currently has no scroll state, no scroll action handling, and no way to navigate its content. Users with large request bodies or many headers simply cannot see the full resolved request.

## Goals / Non-Goals

**Goals:**
- Allow users to scroll up/down through request details content that exceeds the visible panel height
- Reuse the existing scroll pattern (offset state + reducer action + slice rendering) for consistency
- Reset scroll position on natural boundaries (toggle off, change selection, reload)

**Non-Goals:**
- Horizontal scrolling in the details panel (content is short enough; can be added later)
- Resizable detail panel height (keep the fixed ~10 content row cap)
- Making the details panel a focusable panel for Tab cycling (scroll works whenever the panel is visible and response panel has focus)
- Page-up/page-down or fast-scroll in the details panel

## Decisions

### 1. Extend the existing `SCROLL` action vs. add a new `SCROLL_DETAILS` action

**Decision**: Extend the existing `SCROLL` action.

**Rationale**: The `SCROLL` action already branches on `focusedPanel` to choose between `responseScrollOffset` and `requestScrollOffset`. Adding a third branch that checks `showRequestDetails && focusedPanel === 'response'` keeps the action set minimal and matches the existing pattern. A separate action would require duplicating key-handler logic for no benefit.

**Alternative considered**: A dedicated `SCROLL_DETAILS` action type. Rejected because it adds a new action for identical semantics (direction up/down) and the key handler already dispatches `SCROLL` for the response panel — splitting it would mean the `useInput` handler needs to decide which action to dispatch based on UI state, which is the reducer's job.

### 2. Scroll routing: who scrolls when both details and response are visible?

**Decision**: When `showRequestDetails` is true and `focusedPanel === 'response'`, the `SCROLL` action scrolls the **details panel**. The response panel does not scroll while the details panel is open.

**Rationale**: The details panel exists to inspect the request *before* sending it. When a user opens it, their intent is to read the request. Scrolling the response underneath while the details overlay is visible would be confusing. This is the simplest mental model: "what you see on top is what scrolls." To scroll the response, close the details panel with `d`.

**Alternative considered**: Split scroll — e.g. shift+arrow scrolls details while plain arrow scrolls response. Rejected as overly complex for a niche interaction; users can simply toggle with `d`.

### 3. Where to store `detailsScrollOffset`

**Decision**: Add `detailsScrollOffset: number` to the existing `AppState` interface, initialized to `0`.

**Rationale**: Follows the exact pattern of `responseScrollOffset` and `requestScrollOffset`. Single source of truth in the reducer.

### 4. Content model inside RequestDetailsView

**Decision**: Build a flat array of `ReactNode` lines (as today), then slice it: `lines.slice(scrollOffset, scrollOffset + visibleHeight)`. Replace the truncation ellipsis with a scroll position indicator when content overflows.

**Rationale**: This is exactly how `ResponseView` works (line 284 of ResponseView.tsx). Consistent pattern, minimal new logic.

### 5. Scroll position indicator

**Decision**: When content overflows, show a dim indicator line at the bottom: `↕ {current}/{total} lines` — only when there are more lines than the visible window.

**Rationale**: The response panel doesn't show an indicator currently, but the details panel's fixed small height makes it more important to signal that content extends beyond the visible area. Keeps it minimal.

## Risks / Trade-offs

- **[Scroll routing confusion]** → Users might expect arrow keys to scroll the response when details panel is open. Mitigation: this matches the mental model of "top panel captures scroll." Can revisit if user feedback suggests otherwise.
- **[Off-by-one in line slicing]** → The details panel builds lines dynamically (title, method/URL, separator, headers, separator, body). The scroll offset applies to the full line array, so the title and method line scroll away if the user scrolls far enough. This is intentional — same behavior as response panel where the status line scrolls away. Mitigation: careful unit tests for boundary conditions.
- **[State bloat]** → One more number in AppState. Negligible.
