## Context

The environment picker overlay (`src/components/EnvSelectOverlay.tsx`) currently renders every available environment via `options.map(...)` with no height cap, no scroll offset, and no position indicator. The inner `<Box>` has no `height` prop — it auto-sizes to content. On a 24-row terminal with ~15+ environments, the overlay overflows and clips at the terminal bottom.

The codebase already has a mature, reusable pattern for bounded scrollable lists: `RequestList.tsx` + the `getVisibleRequestOffset` helper in `reducer.ts` (lines 15-25). That helper is a pure function that keeps a cursor inside a `[offset, offset + visibleCount)` window. The request list also demonstrates `JUMP_VERTICAL` (jump to top/bottom via `g`/`G`). This change applies the same pattern to the env picker, reusing the existing helper rather than inventing new scroll math.

The env-select state today (`types.ts:122-123`) holds only `envSelectIndex` and `envSelectError`. There is no scroll offset field. Input handling lives in `app.tsx` lines 247-287, dispatching `MOVE_ENV_SELECTION` for `j`/`k`/arrows and silently dropping all other keys.

## Goals / Non-Goals

**Goals:**
- Cap the picker's visible zone to 8 rows (including `(none)`), shrinking to fit when fewer environments exist.
- Keep the panel inside short terminals by deriving the effective cap from `stdout.rows`.
- Add cursor-chase scrolling so the highlight never leaves the visible window.
- Add `g`/`G` jump-to-top/bottom for parity with the request list.
- Add a compact `{n}/{total}` position counter to the footer.
- Reuse `getVisibleRequestOffset` and mirror the `JUMP_VERTICAL` reducer pattern — no new scroll abstractions.

**Non-Goals:**
- Reordering or sorting environment names (config-file order preserved, `--env` appended, `(none)` first).
- Virtualized rendering or windowing beyond the simple slice.
- Page-up / page-down navigation (only single-step and jump-to-end).
- "More above / more below" overflow indicators (chose the compact counter instead).
- Changes to environment aggregation, apply logic, status bar, or persistence.

## Decisions

### Decision 1: Reuse `getVisibleRequestOffset` for cursor-chase scroll

**Choice:** Call the existing `getVisibleRequestOffset(nextIndex, state.envSelectScrollOffset, visibleCount)` inside the `MOVE_ENV_SELECTION` reducer case to compute the new offset.

**Rationale:** The helper is already exported, pure, unit-tested implicitly via request-list behavior, and implements exactly the "keep cursor in window" semantics we want. Writing a second scroll helper would duplicate logic and diverge over time.

**Alternatives considered:**
- *Page-jump scrolling* (window shifts by `visibleCount` when cursor hits the edge): faster for very long lists but disorienting. Rejected — cursor-chase is smoother and matches the request list.
- *Local `useState` scroll in the component*: rejected — breaks the centralized-reducer convention every other scrollable surface in this app follows.

### Decision 2: Add `envSelectScrollOffset` to `AppState`, not component state

**Choice:** New `envSelectScrollOffset: number` field on `AppState`, reset in `ENTER_ENV_SELECT` and `CANCEL_ENV_SELECT`, updated in `MOVE_ENV_SELECTION` and the new `JUMP_ENV_SELECTION`.

**Rationale:** The component is a pure function of props today (`EnvSelectOverlay` takes `options, selectedIndex, activeEnvName, error` and renders). Every other scrollable surface (`requestScrollOffset`, `responseScrollOffset`, `detailsScrollOffset`) lives in `AppState`. Following the convention keeps the component stateless and the reducer the single source of truth.

**Alternatives considered:**
- *Derive offset from `selectedIndex` at render time* (no state field): would lose the "sticky" behavior — if the user scrolls down then back up, a derived offset would jump the window to wherever the cursor is, ignoring manual scroll. The stateful offset preserves the existing window position until the cursor moves out of it.

### Decision 3: Terminal-aware cap via `getEnvPickerVisibleHeight(rows)`

**Choice:** Add `MAX_ENV_PICKER_VISIBLE = 8` and `ENV_PICKER_VERTICAL_OVERHEAD` to `utils/layout.ts`, plus `getEnvPickerVisibleHeight(rows)` returning `Math.min(MAX_ENV_PICKER_VISIBLE, Math.max(1, rows - ENV_PICKER_VERTICAL_OVERHEAD))`.

**Rationale:** The overlay chrome (border 2 + paddingY 2 + title 1 + spacer 1 + footer 1 = 7 rows, plus 1 for safety) means a 12-row terminal can only fit ~5 env rows. Hardcoding 8 would overflow short terminals. The request list uses the same terminal-derived approach via `getRequestVisibleHeight(rows)`. Matching that pattern is consistent and safe.

**Alternatives considered:**
- *Hardcoded 8 with no terminal awareness*: simpler, but would overflow on small terminals — the exact bug we're fixing, just at a different threshold.
- *Dynamic only (no 8 cap)*: would show too many rows on large terminals, defeating the "compact picker" intent.

### Decision 4: `JUMP_ENV_SELECTION` action mirroring `JUMP_VERTICAL`

**Choice:** New action `{ type: 'JUMP_ENV_SELECTION'; target: 'top' | 'bottom' }`. Reducer sets `envSelectIndex` to 0 or `optionCount - 1`, then applies `getVisibleRequestOffset` to sync the offset.

**Rationale:** `JUMP_VERTICAL` (reducer lines 307-344) is the established pattern for jump-to-end. A parallel `JUMP_ENV_SELECTION` keeps the action discriminated union clean and the reducer case self-contained. Using `target: 'top' | 'bottom'` (instead of `direction: 'start' | 'end'`) reads more naturally for a picker context.

**Alternatives considered:**
- *Overload `MOVE_ENV_SELECTION` with a `jump` flag*: rejected — muddies the action's single responsibility.
- *Reuse `JUMP_VERTICAL` with a panel check*: rejected — `JUMP_VERTICAL` is tied to `focusedPanel` which doesn't apply in `envSelect` mode.

### Decision 5: Compact `{n}/{total}` counter in the footer

**Choice:** Modify the existing footer `<Text>` to include ` · {selectedIndex + 1}/{total}` before the key hints.

**Rationale:** One-line change to an existing element. No extra rows, no conditional rendering, no variable-height panel math. The counter gives position feedback without the complexity of "more above/below" indicators that would add 0-2 rows and make the panel height fluctuate.

**Alternatives considered:**
- *"↑ 3 hidden" / "↓ 5 hidden" indicators*: stronger spatial feedback but adds conditional rows, variable panel height, and more render logic. Rejected for complexity.
- *No indicator*: rejected — in an 8-visible list of 30 envs, users lose track of position entirely.

### Decision 6: Slice in the component, not the reducer

**Choice:** The reducer tracks `envSelectScrollOffset` (the window start). The component receives `scrollOffset` as a prop and computes `visibleOptions = options.slice(scrollOffset, scrollOffset + visibleCount)`, then maps over the slice. The `visibleCount` is computed in the component from `stdout.rows` via `getEnvPickerVisibleHeight`.

**Rationale:** This mirrors `RequestList.tsx` line 32 exactly (`requests.slice(scrollOffset, scrollOffset + visibleHeight)`). The reducer doesn't know terminal dimensions (they're not in `AppState`), so the slice bounds belong in the component where `useStdout()` is available. The reducer only owns the offset integer.

## Risks / Trade-offs

- **[Risk] `ENV_PICKER_VERTICAL_OVERHEAD` miscounted** → The chrome row count (border + padding + title + spacer + footer) must be exact or the panel will overflow by 1-2 rows on edge-case terminal heights. **Mitigation:** Count conservatively (8 rows: border 2 + padding 2 + title 1 + spacer 1 + spacer 1 + footer 1) and test at 12, 16, 20, 24, and 40-row terminals. The `Math.max(1, ...)` floor prevents negative visible counts.
- **[Risk] `selectedIndex` vs. slice index confusion** → The component receives the global `selectedIndex` (0-based across all options) but maps over a slice. The highlight check `selectedIndex === index` must compare against the global index, not the slice-local index. **Mitigation:** Iterate the slice with a computed global index: `visibleOptions.map((option, i) => { const globalIndex = scrollOffset + i; ... })`. This is exactly how `RequestList` handles it.
- **[Risk] `g`/`G` already used in normal mode** → In normal mode, `g`/`G` jump the request list. In `envSelect` mode, the `app.tsx` env-select block returns early (line 286) for unknown keys, so `g`/`G` won't leak to the normal handler. **Mitigation:** Add `g`/`G` dispatch inside the `state.mode === 'envSelect'` block, before the fall-through `return`. No conflict because mode is checked first.
- **[Trade-off] Counter takes footer space** → The footer line grows by ~8 characters (` · 5/14`). On the minimum 48-character-wide panel this still fits alongside the existing `↑↓ move · Enter apply · Esc cancel` text. If it doesn't, the footer wraps to 2 lines. **Mitigation:** Verify footer fits at 48-char width; if not, shorten the hint text (e.g., drop the word "move").
