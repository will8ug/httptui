## Why

Users navigating long request lists, large response bodies, or wide content (long URLs, deeply nested JSON) currently have to repeatedly press `j`/`k`/`h`/`l` (or arrows) to reach the top, bottom, left, or right edge of the focused panel. For content with hundreds of lines or very long lines, this is slow and tedious. Vim-inspired edge-jump shortcuts (`g`, `G`, `0`, `$`) are a well-established convention that matches the existing `h/j/k/l` aesthetic already in the app and eliminates this friction.

## What Changes

- Add four new keyboard shortcuts that operate on the currently focused panel (`requests`, `details`, or `response`):
  - `g` — jump to the vertical start (top) of the focused panel
  - `G` — jump to the vertical end (bottom) of the focused panel
  - `0` — jump to the horizontal start (leftmost column) of the focused panel
  - `$` — jump to the horizontal end (rightmost column) of the focused panel
- Add two new action types to the reducer:
  - `JUMP_VERTICAL` with `direction: 'start' | 'end'` and optional `maxOffset` payload
  - `JUMP_HORIZONTAL` with `direction: 'start' | 'end'` and optional `columns` payload
- Reuse existing max-offset computation helpers (`getResponseTotalLines`, `getDetailsTotalLines`, `getMaxScrollOffset`, `getMaxRequestLineWidth`, `getMaxResponseLineWidth`, `getMaxDetailsLineWidth`) so no new geometry logic is introduced.
- Add four new entries to the centralized `SHORTCUTS` registry with `showInBar: false` and `showInHelp: true` (the status bar is already at its 6-item budget).
- Preserve the existing wrap-mode guard: `0` and `$` SHALL be no-ops on the response panel when `wrapMode === 'wrap'`, matching `SCROLL_HORIZONTAL` behavior.
- When `G` targets the `requests` panel, `selectedIndex` is set to `requests.length - 1` and `requestScrollOffset` is adjusted via the existing `getVisibleRequestOffset` helper so the selection remains visible (mirrors `MOVE_SELECTION` behavior).

## Capabilities

### New Capabilities
- `edge-jump-navigation`: Focus-aware vertical and horizontal edge-jump navigation for the three first-class panels, implemented via two new reducer actions (`JUMP_VERTICAL`, `JUMP_HORIZONTAL`) bound to `g`/`G`/`0`/`$` keys.

### Modified Capabilities
- `shortcuts`: Registry adds four new entries (`g`, `G`, `0`, `$`) with `showInBar: false` and `showInHelp: true`; the status-bar shortcut budget is unchanged.

*(Note: The narrative keyboard-shortcuts reference table in `openspec/specs/tui/spec.md` is reference documentation, not a formal requirement; it will be updated alongside this change but does not require a delta spec.)*

## Impact

- **Code**:
  - `src/core/types.ts` — extend `Action` union with `JUMP_VERTICAL` and `JUMP_HORIZONTAL` variants.
  - `src/app.tsx` — add two reducer cases; add four keystroke dispatches in `useInput`; compute `maxOffset` for `JUMP_VERTICAL end` using existing helpers (may introduce a small helper to share logic with the existing `SCROLL` branch).
  - `src/core/shortcuts.ts` — add four entries to the `SHORTCUTS` array.
- **Tests**:
  - New reducer-level unit tests covering all 12 combinations (3 panels × 2 axes × 2 directions) plus the wrap-mode no-op for `0`/`$` on the response panel.
- **Docs**:
  - `README.md` — extend the Keyboard Shortcuts table with the four new keys.
  - `openspec/specs/tui/spec.md` — keyboard-shortcuts table updated via delta.
  - `openspec/specs/shortcuts/spec.md` — registry entries updated via delta.
- **Dependencies**: None — no new libraries, no version bumps.
- **Backwards compatibility**: Fully additive. No existing shortcut or action is changed. No state shape changes beyond the additive action variants.
