## Context

The httptui app has a request details panel (`RequestDetailsView`) toggled with `d`. It renders the resolved HTTP method, URL, headers, and body inside a bordered box with a hard cap of ~10 content rows. Content beyond that cap is truncated with an ellipsis ("… (N more lines)"). The response panel and request list both already support vertical and horizontal scrolling via offset state fields, `SCROLL`/`SCROLL_HORIZONTAL` reducer actions, and slice-based rendering.

The details panel currently has no scroll state, no focus state, and no way to navigate its content. It renders with a static gray border regardless of which panel is focused.

The app currently has a 2-panel focus model: `FocusedPanel = 'requests' | 'response'`, toggled by Tab. All scroll routing branches on this value.

## Goals / Non-Goals

**Goals:**
- Make the details panel a first-class focusable panel with Tab cycling
- Allow users to scroll up/down and left/right through request details when the panel is focused
- Reuse the existing scroll pattern (offset state + reducer action + slice rendering) for consistency
- Provide visual focus feedback (border/title color) matching the existing `cyanBright`/`gray` pattern
- Reset scroll position on natural boundaries (toggle off, change selection, reload)

**Non-Goals:**
- Resizable detail panel height (keep the fixed ~10 content row cap)
- Page-up/page-down or fast-scroll in the details panel
- Wrap mode for the details panel (always nowrap)

## Decisions

### 1. Three-panel focus model via `FocusedPanel` union expansion

**Decision**: Expand `FocusedPanel` from `'requests' | 'response'` to `'requests' | 'details' | 'response'`.

**Rationale**: This is the cleanest way to make the details panel focusable. The existing `SCROLL`, `SCROLL_HORIZONTAL`, and key handler logic all branch on `focusedPanel`. Adding a third value means each branch gets a natural `'details'` case with no special-case hacks. The reducer routes scroll actions purely based on `focusedPanel` — no `showRequestDetails` checks needed in scroll logic.

**Alternative considered**: Keeping `FocusedPanel` as 2-value and hijacking the response panel's scroll when details is visible. Rejected because it creates a confusing UX where arrow keys scroll a different panel than the one that appears focused, and it prevents scrolling the response while details is open.

### 2. Conditional Tab cycling

**Decision**: `SWITCH_PANEL` cycles through panels in order: `requests → details → response → requests`. When `showRequestDetails` is false, the `'details'` step is skipped: `requests → response → requests`.

**Rationale**: Tab should only cycle to visible panels. The cycle order matches the visual layout (left → top-right → bottom-right). Skipping `'details'` when hidden keeps the existing 2-panel behavior for users who don't use the details panel.

**Implementation**: The `SWITCH_PANEL` reducer case uses a next-panel function that checks `showRequestDetails` to determine the cycle.

### 3. Focus transition when toggling details off

**Decision**: When `TOGGLE_REQUEST_DETAILS` hides the panel while `focusedPanel === 'details'`, focus moves to `'response'`.

**Rationale**: The details panel lives in the right column above the response view. When it disappears, the response view expands to fill the space. Moving focus to `'response'` is the natural fallback — it's what visually replaces the details panel. Toggling details on does NOT change focus; the user must Tab to it intentionally.

### 4. Scroll routing via focusedPanel — no special cases

**Decision**: The `SCROLL` and `SCROLL_HORIZONTAL` reducer cases branch on `focusedPanel` with three cases: `'requests'`, `'details'`, `'response'`. No `showRequestDetails` check is needed in scroll logic.

**Rationale**: Focus already implies intent. If `focusedPanel === 'details'`, the user Tabbed there on purpose. If `focusedPanel === 'response'`, they want to scroll the response. The focus model handles routing cleanly without special cases. This is simpler than the originally proposed hijack approach.

### 5. Horizontal scroll for details panel

**Decision**: Support horizontal scrolling in the details panel, using a new `detailsHorizontalOffset` in AppState. The `SCROLL_HORIZONTAL` reducer gets a `'details'` branch.

**Rationale**: URLs and header values can exceed the panel width. Since the details panel is now a full participant in the focus model, it should behave identically to other panels. Consistency > minimalism.

### 6. Content model inside RequestDetailsView

**Decision**: Build a flat array of `ReactNode` lines (as today), then slice it: `lines.slice(scrollOffset, scrollOffset + visibleHeight)`. Replace the truncation ellipsis with a scroll position indicator when content overflows.

**Rationale**: This is exactly how `ResponseView` works. Consistent pattern, minimal new logic.

### 7. Visual focus indication

**Decision**: Add a `focused` boolean prop to `RequestDetailsView`. Apply the same `borderColor={focused ? 'cyanBright' : 'gray'}` and title `color={focused ? 'cyanBright' : 'gray'}` pattern used by `RequestList` and `ResponseView`.

**Rationale**: Visual consistency. Users need to know which panel will receive scroll input.

### 8. Enter key behavior when details is focused

**Decision**: `Enter` sends the selected request regardless of `focusedPanel` value. No change needed — the current `useInput` handler dispatches `sendSelectedRequest()` on `key.return` without checking focus.

**Rationale**: The user is looking at the request details, they like what they see, they press Enter. Requiring Tab back to requests first would be needlessly cumbersome.

## Risks / Trade-offs

- **[3-panel Tab cycle learning curve]** → Users accustomed to 2-panel Tab toggle get an extra stop. Mitigation: the details panel is only in the cycle when visible (`showRequestDetails: true`). Default is hidden, so the default experience is unchanged.
- **[Off-by-one in line slicing]** → The details panel builds lines dynamically (title, method/URL, separator, headers, separator, body). The scroll offset applies to the full line array, so the title and method line scroll away if the user scrolls far enough. This is intentional — same behavior as response panel where the status line scrolls away. Mitigation: careful unit tests for boundary conditions.
- **[State growth]** → Two new numbers in AppState (`detailsScrollOffset`, `detailsHorizontalOffset`). Negligible.
- **[FocusedPanel type change ripple]** → Every `focusedPanel ===` check in the codebase needs review. Mitigation: TypeScript exhaustiveness checks will catch any unhandled cases at compile time.
