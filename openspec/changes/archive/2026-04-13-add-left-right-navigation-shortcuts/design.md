## Context

httptui is a terminal-based HTTP client built with Ink (React for CLI). The app has a split-panel layout: RequestList (left, ~30% width) and ResponseView (right, ~70% width). Both panels currently only support vertical scrolling via ↑/↓/j/k keys. Content that exceeds panel width is truncated with `…` via `truncateText()` — there is no mechanism to reveal the hidden portion.

Key input handling lives in `app.tsx` using Ink's `useInput` hook, dispatching `Action` union types to a `reducer`. The state machine tracks `requestScrollOffset` and `responseScrollOffset` (vertical only). Keyboard shortcuts are centralized in `src/core/shortcuts.ts` and consumed by `StatusBar` and `HelpOverlay`.

## Goals / Non-Goals

**Goals:**
- Allow users to scroll horizontally in both the RequestList and ResponseView panels using ←/h (left) and →/l (right) keys
- Horizontally scroll only the currently focused panel, matching the existing vertical scroll behavior
- Display the new shortcuts in the status bar and help overlay via the existing centralized shortcut system
- Reset horizontal scroll offset when switching requests (RequestList) or receiving a new response (ResponseView)

**Non-Goals:**
- Smooth/pixel-level horizontal scrolling (we scroll by character columns, matching Ink's text-based rendering)
- Persistent horizontal offset across request switches or response changes
- Horizontal scrolling in overlays (help, file-load)
- Touch/gesture support (this is a terminal app)

## Decisions

### Decision 1: Add separate `SCROLL_HORIZONTAL` action vs extend `SCROLL`

**Choice**: Add a new `SCROLL_HORIZONTAL` action type with `direction: 'left' | 'right'`.

**Rationale**: The existing `SCROLL` action handles `up`/`down` and is tightly coupled to the `responseScrollOffset`/`requestScrollOffset` vertical-only logic in the reducer (it uses `Math.max(0, offset + delta)` which works for downward-only vertical scroll). Extending `SCROLL` to handle four directions would bloat the reducer case and make the `direction` type a 4-way union. A separate action keeps concerns separated and makes each action handler simpler.

**Alternative considered**: Extend `SCROLL` with `'left' | 'right'` directions. Rejected because the vertical scroll logic has different clamping behavior (no upper bound, just `Math.max(0, ...)`) and the handler would need to branch on direction type, making the reducer harder to read.

### Decision 2: Scroll step size

**Choice**: Horizontal scroll by **2 characters** per keypress.

**Rationale**: Single character feels too slow; half a typical word width (~4 chars) is too fast. 2 characters per press provides responsive navigation without overshooting. This is the same approach used by terminal emulators and editors like less/vim horizontal scroll.

### Decision 3: Key bindings — ←/h and →/l

**Choice**: Arrow keys ←/→ plus vim-style h/l for horizontal navigation.

**Rationale**: The app already uses vim keys for vertical navigation (j/k = down/up). Adding h/l for left/right is consistent with the vim navigation model. Arrow keys provide discoverability for non-vim users. This mirrors the existing pattern where both ↑/k and ↓/j work.

### Decision 4: Key binding conflict — h/l in RequestList with text input

**Choice**: h/l always control horizontal scroll in normal mode, same as j/k always control vertical navigation. No conflict since the app never enters a text-editing mode for request names.

**Rationale**: The only text input mode is `fileLoad`, which captures all keystrokes. In normal mode, h/l are unoccupied and match the vim convention established by j/k.

### Decision 5: Horizontal offset reset points

**Choice**: Reset `requestHorizontalOffset` to 0 when `SELECT_REQUEST` or `MOVE_SELECTION` fires. Reset `responseHorizontalOffset` to 0 when `SEND_REQUEST` fires.

**Rationale**: When the user selects a different request, the content changes entirely — the old horizontal scroll position is meaningless. Same for sending a new request where the response content is replaced. This mirrors how the existing vertical `responseScrollOffset` is already reset on `SEND_REQUEST`.

## Risks / Trade-offs

- **[Truncated text still truncated in rendering]** → The `truncateText()` function hard-truncates lines at panel width. Horizontal scroll means we need to render the full line content and visually offset it. Since Ink renders to a terminal, we can't truly "scroll" a clipped region — we need to render the substring of each line starting at the offset position, effectively re-`truncateText`'ing from the offset point. This is a rendering concern handled in the components, not a blocker.
- **[Long lines in RequestList]** → Request paths can be quite long. Horizontal scrolling here is less common but still valuable for seeing full URLs. The 2-char step may feel slow for very long URLs, but this matches terminal convention and users can hold the key for repeated input.
- **[Status bar space]** → Adding another shortcut to the status bar (which already shows 6 entries) increases the risk of truncation on narrow terminals. The `←/→` label is short (6 chars including brackets) so the impact is minimal.