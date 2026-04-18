## Context

httptui is a keyboard-driven TUI built with Ink. Navigation within each of the three first-class panels (`requests`, `details`, `response`) currently uses `h/j/k/l` (and arrow keys) for incremental scrolling:

- Vertical scroll: `SCROLL` action with `direction` + optional `maxOffset` (`src/app.tsx` lines 189–217).
- Horizontal scroll: `SCROLL_HORIZONTAL` action with `direction` + optional `columns` (lines 219–251).

Existing helpers already compute every bound needed for edge jumps:

- `getMaxRequestLineWidth(requests)` — widest formatted request-list line.
- `getMaxResponseLineWidth(state)` — widest response line (status + headers [if verbose] + body).
- `getMaxDetailsLineWidth(state)` — widest details line (method/URL + headers + body).
- `getResponseTotalLines(...)` and `getDetailsTotalLines(...)` — total vertical line counts.
- `getMaxScrollOffset(totalLines, visibleHeight)` — two-way clamped upper bound.
- `getRequestContentWidth(columns)` / `getResponseContentWidth(columns)` — visible widths.
- `getVisibleRequestOffset(selectedIndex, currentOffset)` — brings selection into view.

The existing `SCROLL_HORIZONTAL` reducer case already contains a wrap-mode guard: when `focusedPanel === 'response' && wrapMode === 'wrap'`, the action is a no-op. Any new horizontal-edge action must honor the same guard.

The centralized `SHORTCUTS` registry (`src/core/shortcuts.ts`) is the single source of truth for StatusBar and HelpOverlay.

## Goals / Non-Goals

**Goals:**
- Add four vim-style edge-jump shortcuts (`g`, `G`, `0`, `$`) that operate on the currently focused panel.
- Reuse every existing geometry and clamp helper — introduce zero new computation logic.
- Keep the reducer pure (no direct terminal dimension reads); pass `maxOffset` / `columns` on the action payload, matching the established `SCROLL` / `SCROLL_HORIZONTAL` pattern.
- Preserve the existing wrap-mode no-op on the response panel for horizontal edge jumps.
- Keep the status bar uncluttered: new shortcuts appear in the help overlay only (`showInBar: false`).

**Non-Goals:**
- No `gg` multi-key prefix. `g` alone is bound — this is not a text editor and `g` has no other use.
- No count prefixes (e.g., `5G` to jump to the 5th line). Out of scope; no other shortcut in the app accepts counts.
- No `PageUp`/`PageDown` / `Ctrl-d`/`Ctrl-u` half-page scrolling. Separate proposal if needed.
- No changes to `Home`/`End` handling — the four shortcuts are `g`/`G`/`0`/`$` only.
- No refactor of the existing per-panel reducer branching. The new actions mirror the existing style even if it is repetitive.

## Decisions

### Decision 1: Split actions by axis (two actions, not one)

Use two new action variants:

```ts
| { type: 'JUMP_VERTICAL';   direction: 'start' | 'end'; maxOffset?: number }
| { type: 'JUMP_HORIZONTAL'; direction: 'start' | 'end'; columns?: number  }
```

**Rationale:** The reducer already uses the same split for incremental scroll (`SCROLL` vs `SCROLL_HORIZONTAL`). Mirroring this keeps the reducer cases symmetrical and legible.

**Alternatives considered:**
- Single `JUMP { axis: 'vertical' | 'horizontal', direction: 'start' | 'end' }` action — rejected because it would require a union-style payload (optional `maxOffset` vs optional `columns`) and the branching inside the reducer would still be split by axis anyway.
- Four separate actions (`JUMP_TOP`, `JUMP_BOTTOM`, `JUMP_LEFT`, `JUMP_RIGHT`) — rejected as unnecessary verbosity; `direction` is a simple enum.

### Decision 2: Compute `maxOffset` in `useInput`, not the reducer

For `G` (vertical end), the reducer needs the upper bound. The upper bound depends on terminal dimensions (`columns`, `responseAvailableHeight`) which the reducer does not have access to. Compute in the component layer and pass as payload — identical to how the existing `SCROLL` case handles vertical bottoming out.

**Rationale:** Keeps the reducer pure. Matches established precedent.

**Alternatives considered:**
- Pass terminal dimensions into the reducer via global — rejected; the current pattern is explicitly payload-based.
- Recompute inside the reducer using a passed-in `state` snapshot — rejected; dimensions live in `useStdout()`, not state.

### Decision 3: Extract a shared `computeVerticalMaxOffset` helper

The existing `SCROLL` dispatch at lines 593–625 of `app.tsx` computes `maxOffset` per panel. The new `JUMP_VERTICAL end` dispatch needs the same computation. Extract a single helper:

```ts
function computeVerticalMaxOffset(
  state: AppState,
  columns: number,
  responseAvailableHeight: number,
  detailPanelMaxContent: number,
): number | undefined
```

Used by both the `SCROLL` branch and the new `JUMP_VERTICAL` branch for the `details` and `response` focused-panel cases. Returns `undefined` when focus is `requests` (no offset to bound — `MOVE_SELECTION`-style semantics apply).

**Rationale:** DRY principle; single point of change if scroll-bound logic evolves. Confined to `app.tsx` — no new module needed.

**Alternatives considered:**
- Inline the computation twice — rejected; drift risk.
- Move the helper to `utils/scroll.ts` — possible but premature. Keep local until a third caller appears.

### Decision 4: Jump-to-bottom on `requests` panel follows `MOVE_SELECTION` semantics

Pressing `G` with `focusedPanel === 'requests'`:
- Sets `selectedIndex = requests.length - 1`
- Sets `requestScrollOffset = getVisibleRequestOffset(lastIndex, requestScrollOffset)`
- Resets `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` to `0` (same as `MOVE_SELECTION` / `SELECT_REQUEST`)

**Rationale:** Consistent with existing `MOVE_SELECTION` behavior — selecting changes the selection and its related resets. `G` is "go to last request," which is a selection change.

Pressing `g` with `focusedPanel === 'requests'`:
- Sets `selectedIndex = 0`
- Same resets as above.

### Decision 5: Horizontal edge jumps honor the wrap-mode no-op

Both `0` and `$` SHALL be no-ops when `focusedPanel === 'response' && wrapMode === 'wrap'`, returning state unchanged. This mirrors the existing `SCROLL_HORIZONTAL` guard on line 220 of `app.tsx`.

**Rationale:** In wrap mode, there is no horizontal axis to jump along — all content fits within the panel width. Making the shortcut a no-op prevents surprising behavior (e.g., stale `responseHorizontalOffset` values that would re-apply if wrap mode were toggled off).

### Decision 6: Status bar budget is preserved (no new `showInBar: true` entries)

All four new shortcut registry entries use `showInBar: false, showInHelp: true`. The existing status bar has its 6-item budget (per the shortcuts spec) and edge-jumps are secondary to core navigation.

**Rationale:** Matches the documented `showInBar` policy. Help overlay is the right discovery surface for these shortcuts.

### Decision 7: Key choice — `g`, `G`, `0`, `$`

Vim-style. Single-keystroke each. No conflicts with existing bindings (`h/j/k/l/v/r/w/q/?/d/o/R/Tab/Enter/Escape`).

- `g` alone is used (not `gg`) because there is no other `g`-prefix shortcut in the app; no state machine is needed.
- `$` depends on Shift+4 on US keyboards. Ink's `useInput` receives the resulting character, so this works across layouts for input — users on non-US layouts can still type `$`.
- `0` is safe: no numeric-input mode exists in the app.

**Alternatives considered:** `Home`/`End`/`Shift+Home`/`Shift+End` — rejected as less consistent with the vim aesthetic already set by `h/j/k/l`.

## Risks / Trade-offs

- **Risk: `g` alone might feel unnatural to hardcore vim users who expect `gg`.**
  Mitigation: Document clearly in help overlay and README. The cost of a prefix state machine (tracking "last key was `g`") exceeds the benefit; single-key is simpler and discoverable.

- **Risk: `$` requires Shift on US keyboards and may map to a different character on some non-US layouts.**
  Mitigation: `$` is the vim convention; users who customize layouts are already accustomed to this. If user feedback shows this is a pain point, a `Home`/`End` alternative can be added later without removing `0`/`$`.

- **Risk: `maxOffset` computation for vertical bottom duplicates logic already in `useInput`'s `SCROLL` branch.**
  Mitigation: Extract `computeVerticalMaxOffset` helper in `app.tsx` and use it from both branches. This is part of this change's scope.

- **Trade-off: No count prefixes (e.g., `5G`).**
  Accepted: Adds state-machine complexity disproportionate to utility. Can be added later if demand appears.

- **Trade-off: Four new entries in the help overlay.**
  Accepted: Help overlay already has 16 entries and is well-organized. Adding 4 more does not meaningfully degrade readability.

## Migration Plan

Purely additive — no migration needed. Existing shortcuts, actions, and state fields are unchanged. A user updating to the new version gains four new shortcuts with no change to anything they were already doing.

**Rollback:** Revert the commit. No data or state migrations are involved.

## Open Questions

None. All design decisions have been made based on established patterns in the existing codebase.
