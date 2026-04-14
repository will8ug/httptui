## Context

httptui's response panel currently has a single display mode: long lines are truncated to the panel width with a `…` ellipsis, and horizontal scrolling (`←`/`→`/`h`/`l`) shifts content left. There is no way to see full line content without scrolling. The app uses a `useReducer` state machine in `app.tsx` with a discriminated union `Action` type, and the response view renders lines one-by-one into an array sliced by `scrollOffset` for vertical scrolling.

Key existing files:
- `src/core/types.ts` — `AppState` and `Action` types
- `src/core/shortcuts.ts` — centralized shortcut registry
- `src/app.tsx` — reducer, `useInput`, and component orchestration
- `src/components/ResponseView.tsx` — truncation via `truncateText()` and horizontal shift via `shiftLine()`
- `src/utils/colors.ts` — `colorizeJson()` returns `Array<{text, color}>` segments per line

## Goals / Non-Goals

**Goals:**
- Add a `w` keyboard shortcut that toggles between **nowrap** (current truncate + horizontal-scroll behavior) and **wrap** (word-wrap lines at the panel boundary)
- In wrap mode, all content is visible without horizontal scrolling; lines that exceed the panel width continue on the next visual line
- JSON syntax colorization is preserved across wrapped lines
- Vertical scrolling (`↑`/`↓`/`j`/`k`) continues to work in both modes
- The shortcut is visible in the status bar and help overlay

**Non-Goals:**
- Soft-wrap indicators (e.g., `↵` at line breaks) — out of scope
- Configurable wrap column — always wraps at the panel boundary
- Wrapping in the request list panel — only the response panel gets wrap mode
- Per-request wrap memory — the wrap state is global, not per-request

## Decisions

### 1. State representation: `'nowrap' | 'wrap'` field on `AppState`

**Decision**: Add `wrapMode: 'nowrap' | 'wrap'` to `AppState`, defaulting to `'nowrap'`.

**Rationale**: Matches the existing pattern (e.g., `verbose: boolean`, `focusedPanel: FocusedPanel`). A string enum is more readable than a boolean. Defaulting to `'nowrap'` preserves current behavior.

**Alternative considered**: A boolean `wrapEnabled`. Rejected — a string enum is self-documenting and extensible if we ever want more modes (e.g., `hard`).

### 2. Key binding: `w`

**Decision**: Use `w` for wrap toggle. Label: `Wrap`. `showInBar: false` (status bar limited to 6 shortcuts; wrap is discoverable via help overlay), `showInHelp: true`.

**Rationale**: Intuitive (w for wrap), not currently bound, and consistent with other toggle shortcuts (`v` for verbose).

### 3. Wrap implementation: manual line wrapping with colorized segment splitting

**Decision**: Implement wrapping ourselves rather than using Ink's `<Text wrap="wrap">` prop.

**Rationale**: The existing rendering pipeline builds an array of visual `ReactElement` lines and slices them by `scrollOffset`. Ink's native `wrap` prop would handle wrapping internally, making it impossible to compute which visual lines to show for vertical scrolling. Manual wrapping keeps the architecture consistent: compute all visual lines first, then slice for viewport.

**Alternative considered**: Ink native `wrap` prop. Rejected because it breaks the scrollOffset-based vertical scrolling mechanism. We'd need a separate scroll mechanism for wrap mode, adding significant complexity.

### 4. Horizontal scroll behavior in wrap mode: disabled

**Decision**: When `wrapMode === 'wrap'`, `←`/`→`/`h`/`l` keys do not scroll the response panel horizontally. The `horizontalOffset` is treated as `0` in wrap mode.

**Rationale**: In wrap mode, all content is visible without horizontal scrolling. Allowing horizontal scroll in wrap mode would be confusing and redundant.

### 5. Color preservation across wrapped lines

**Decision**: For JSON lines, apply `colorizeJson()` first to get segments, then split segments at contentWidth boundaries to produce multiple visual lines, each preserving its color spans.

**Rationale**: This maintains JSON syntax coloring even when a single source line wraps across multiple visual lines. A `wrapColorizedSegments(segments, maxWidth)` utility handles the splitting logic.

**Alternative considered**: Plain-text wrapping for JSON lines (no colors on continuation lines). Rejected — inconsistent visual experience where the first visual line of a source line is colored but continuation lines are not.

### 6. Reset horizontal offset on mode toggle

**Decision**: Dispatching `TOGGLE_WRAP` also resets `responseHorizontalOffset` to `0`.

**Rationale**: When switching to wrap mode, there's no horizontal scroll. When switching back to nowrap, starting from offset 0 is the least surprising behavior.

## Risks / Trade-offs

- **Performance on very long single-line responses**: A minified JSON response (one huge line) would produce N visual lines where N ≈ lineLength / contentWidth. This could be 1000+ elements. Mitigation: the existing scroll mechanism already uses `slice(scrollOffset, scrollOffset + visibleHeight)` to limit rendered elements, so at most `visibleHeight` elements are in the DOM at any time.

- **Word-break edge cases**: The `wrapLine` function breaks at word boundaries when possible, but falls back to mid-word breaks for strings longer than contentWidth with no spaces. This matches terminal convention.

- **Scroll offset discontinuity on toggle**: When toggling to wrap mode, the total number of visual lines changes, so `scrollOffset` may now point past the end. Mitigation: `TOGGLE_WRAP` resets `responseScrollOffset` to `0`.