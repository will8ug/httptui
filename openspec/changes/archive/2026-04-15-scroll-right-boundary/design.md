## Context

The httptui app has two horizontally-scrollable panels (RequestList and ResponseView). The current `SCROLL_HORIZONTAL` reducer calculates the right boundary as `maxLineWidth - 1`, which allows scrolling until only one character of the longest line remains visible — even when the panel is wide enough to show the entire line. The user experience problem: you can keep scrolling right well past the point where all content is already visible.

The root cause is that the reducer lacks information about the panel's visible width (`contentWidth`). The boundary calculation currently lives in `app.tsx` within the reducer, while `contentWidth` is computed inside component render functions (`ResponseView.tsx` line 122, `RequestList.tsx` line 46) using `stdout.columns`.

## Goals / Non-Goals

**Goals:**
- Stop horizontal scrolling right when the last character of the longest line is within the panel's right edge
- Provide smooth behavior on terminal resize (clamp offset if it exceeds the new boundary)
- Apply the same boundary logic consistently to both panels

**Non-Goals:**
- Changing horizontal scroll step size (remains ±2 characters per keypress)
- Changing vertical scroll behavior
- Changing the wrap-mode toggle or its interaction with horizontal scroll
- Handling terminal resize events beyond clamping the offset (no dynamic re-rendering push)

## Decisions

### Decision 1: Pass `columns` through the action payload

**Choice**: Add an optional `columns` field to the `SCROLL_HORIZONTAL` action, and use it to compute `contentWidth` inside the reducer.

**Alternatives considered**:
1. **Store `columns` in `AppState`** — Requires a new `RESIZE` action and listener. More infrastructure for minimal benefit since we only need `columns` during `SCROLL_HORIZONTAL`.
2. **Compute `maxOffset` in the component and pass it as the action payload** — Moves boundary logic out of the reducer, breaking the single-source-of-truth pattern.
3. **Use `process.stdout.columns` directly in the reducer** — Couples the reducer to the Node.js process, making it untestable.

**Rationale**: The action payload approach keeps the reducer pure and testable while giving it the width data it needs. The `useInput` handler in `App` already has access to `useStdout()`, so `columns` is trivially available when dispatching.

### Decision 2: Compute `contentWidth` in the reducer using the same formulas as the components

**Choice**: Extract the `getLeftPanelWidth` and content-width formulas from the components into shared utility functions, and call them in the reducer.

**Formulas**:
- Left panel width: `clamp(floor(columns * 0.3), 25, 36)`
- Request panel content width: `max(10, leftPanelWidth - 4)`
- Response panel content width: `max(20, columns - leftPanelWidth - 6)`

**Rationale**: The existing `getLeftPanelWidth` function is already duplicated across `Layout.tsx`, `ResponseView.tsx`, and `RequestList.tsx`. Centralizing it removes duplication and ensures the reducer uses the same width calculation as the rendering layer.

### Decision 3: New maxOffset formula

**Choice**: `maxOffset = max(0, maxLineWidth - contentWidth)`

**Previous formula**: `maxOffset = max(0, maxLineWidth - 1)`

**Rationale**: If the longest line is 120 characters and the visible `contentWidth` is 60, the user needs to scroll at most 60 characters to see the end. An offset of 60 means the viewport shows characters 60–119, placing the last character right at the right edge. Any further scrolling would show empty space past the content.

### Decision 4: Clamping on resize / content change

**Choice**: Clamp `horizontalOffset` to the new `maxOffset` whenever:
- `SCROLL_HORIZONTAL` is dispatched (already happens via `Math.min`)
- `SEND_REQUEST` is dispatched (already resets to `0`)
- `SELECT_REQUEST` / `MOVE_SELECTION` is dispatched (already resets to `0`)

No new resize event listener is needed. If the terminal shrinks mid-session, the offset will only exceed the new boundary until the next `SCROLL_HORIZONTAL` action, at which point it will be clamped. This is acceptable because: (a) horizontal scroll actions are rapid and frequent, (b) the visual glitch of a temporarily over-scrolled state is minimal, and (c) Ink re-renders on the next action will correct the display.

**Alternative considered**: Add a `RESIZE` action with a `useStdout` resize listener to immediately re-clamp. Rejected because it adds complexity for an edge case (terminal resize during a scroll session) that self-corrects on the next keypress.

## Risks / Trade-offs

- **[Risk] Stale `columns` value** → If the terminal resizes between when `useInput` reads `columns` and when the reducer processes the action, the offset may be computed against the old width. Mitigation: the next scroll action will use the updated width and clamp accordingly, so the error is transient and self-correcting.
- **[Risk] Duplicated width formula** → Even with centralized utilities, the formula must be kept in sync between reducer and components. Mitigation: extract `getLeftPanelWidth` and `getContentWidth` into `src/utils/layout.ts` and import from both places.
- **[Trade-off] No immediate resize clamp** → Accepting a minor visual artifact on terminal resize in exchange for simpler code. The offset self-corrects on the next horizontal scroll action.