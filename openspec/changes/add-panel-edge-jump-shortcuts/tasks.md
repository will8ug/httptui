## 1. Action types

- [ ] 1.1 Add `JUMP_VERTICAL` variant to the `Action` union in `src/core/types.ts` with shape `{ type: 'JUMP_VERTICAL'; direction: 'start' | 'end'; maxOffset?: number }`
- [ ] 1.2 Add `JUMP_HORIZONTAL` variant to the `Action` union in `src/core/types.ts` with shape `{ type: 'JUMP_HORIZONTAL'; direction: 'start' | 'end'; columns?: number }`

## 2. Reducer cases

- [ ] 2.1 Add `JUMP_VERTICAL` case to the reducer in `src/app.tsx` handling all three focused panels (`requests`, `details`, `response`) for both `direction: 'start'` and `direction: 'end'`, using `getVisibleRequestOffset` for the requests panel and clamping details/response scroll offsets to `[0, maxOffset]` when `maxOffset` is provided
- [ ] 2.2 For `JUMP_VERTICAL` on the `requests` panel, reset `requestHorizontalOffset`, `detailsScrollOffset`, and `detailsHorizontalOffset` to `0` (mirror `MOVE_SELECTION` / `SELECT_REQUEST` behavior)
- [ ] 2.3 Add `JUMP_HORIZONTAL` case to the reducer in `src/app.tsx` handling all three focused panels for both `direction: 'start'` and `direction: 'end'`, using existing `getMaxRequestLineWidth`, `getMaxDetailsLineWidth`, and `getMaxResponseLineWidth` helpers for upper bounds; default `columns` to `80` when omitted
- [ ] 2.4 In `JUMP_HORIZONTAL`, return state unchanged when `focusedPanel === 'response'` and `wrapMode === 'wrap'` (mirror the existing `SCROLL_HORIZONTAL` guard)

## 3. Shared vertical max-offset helper

- [ ] 3.1 Extract a `computeVerticalMaxOffset(state, columns, responseAvailableHeight, detailPanelMaxContent)` helper in `src/app.tsx` that returns the correct `maxOffset` for `focusedPanel === 'details'` or `focusedPanel === 'response'`, using `getDetailsTotalLines`, `getResponseTotalLines`, and `getMaxScrollOffset`, and returns `undefined` for `focusedPanel === 'requests'`
- [ ] 3.2 Refactor the existing `SCROLL` dispatch in the `useInput` handler to use `computeVerticalMaxOffset` (verify no behavior change via existing scroll tests)

## 4. Key bindings in useInput

- [ ] 4.1 Add `g` keystroke handler dispatching `{ type: 'JUMP_VERTICAL', direction: 'start' }`
- [ ] 4.2 Add `G` keystroke handler dispatching `{ type: 'JUMP_VERTICAL', direction: 'end', maxOffset }` where `maxOffset` is computed via `computeVerticalMaxOffset`
- [ ] 4.3 Add `0` keystroke handler dispatching `{ type: 'JUMP_HORIZONTAL', direction: 'start', columns }`
- [ ] 4.4 Add `$` keystroke handler dispatching `{ type: 'JUMP_HORIZONTAL', direction: 'end', columns }`
- [ ] 4.5 Ensure all four handlers return before the existing `isUp`/`isDown`/`isLeft`/`isRight` logic and respect the existing overlay/fileLoad-mode early returns

## 5. Shortcut registry

- [ ] 5.1 Add `{ key: 'g', label: '', description: 'Jump to top of focused panel', showInBar: false, showInHelp: true }` to `SHORTCUTS` in `src/core/shortcuts.ts`
- [ ] 5.2 Add `{ key: 'G', label: '', description: 'Jump to bottom of focused panel', showInBar: false, showInHelp: true }` to `SHORTCUTS`
- [ ] 5.3 Add `{ key: '0', label: '', description: 'Jump to horizontal start of focused panel', showInBar: false, showInHelp: true }` to `SHORTCUTS`
- [ ] 5.4 Add `{ key: '$', label: '', description: 'Jump to horizontal end of focused panel', showInBar: false, showInHelp: true }` to `SHORTCUTS`

## 6. Tests — JUMP_VERTICAL reducer

- [ ] 6.1 Add test: `JUMP_VERTICAL { direction: 'start' }` on `requests` panel sets `selectedIndex` to `0` and adjusts `requestScrollOffset`
- [ ] 6.2 Add test: `JUMP_VERTICAL { direction: 'end' }` on `requests` panel sets `selectedIndex` to `requests.length - 1` and adjusts `requestScrollOffset`
- [ ] 6.3 Add test: `JUMP_VERTICAL { direction: 'end' }` on `requests` panel with empty `requests` clamps `selectedIndex` to `0`
- [ ] 6.4 Add test: `JUMP_VERTICAL { direction: 'start' }` on `details` panel sets `detailsScrollOffset` to `0`
- [ ] 6.5 Add test: `JUMP_VERTICAL { direction: 'end', maxOffset: N }` on `details` panel sets `detailsScrollOffset` to `N`
- [ ] 6.6 Add test: `JUMP_VERTICAL { direction: 'start' }` on `response` panel sets `responseScrollOffset` to `0`
- [ ] 6.7 Add test: `JUMP_VERTICAL { direction: 'end', maxOffset: N }` on `response` panel sets `responseScrollOffset` to `N`
- [ ] 6.8 Add test: `JUMP_VERTICAL { direction: 'end' }` without `maxOffset` on `details` or `response` panel leaves scroll offset unchanged

## 7. Tests — JUMP_HORIZONTAL reducer

- [ ] 7.1 Add test: `JUMP_HORIZONTAL { direction: 'start' }` on `requests` panel sets `requestHorizontalOffset` to `0`
- [ ] 7.2 Add test: `JUMP_HORIZONTAL { direction: 'end', columns }` on `requests` panel clamps `requestHorizontalOffset` to `max(0, maxWidth - contentWidth)`
- [ ] 7.3 Add test: `JUMP_HORIZONTAL { direction: 'start' }` on `details` panel sets `detailsHorizontalOffset` to `0`
- [ ] 7.4 Add test: `JUMP_HORIZONTAL { direction: 'end', columns }` on `details` panel clamps `detailsHorizontalOffset` to `max(0, maxDetailsWidth - contentWidth)`
- [ ] 7.5 Add test: `JUMP_HORIZONTAL { direction: 'start' }` on `response` panel in `nowrap` mode sets `responseHorizontalOffset` to `0`
- [ ] 7.6 Add test: `JUMP_HORIZONTAL { direction: 'end', columns }` on `response` panel in `nowrap` mode clamps `responseHorizontalOffset` to `max(0, maxResponseWidth - contentWidth)`
- [ ] 7.7 Add test: `JUMP_HORIZONTAL { direction: 'start' }` on `response` panel in `wrap` mode returns state unchanged
- [ ] 7.8 Add test: `JUMP_HORIZONTAL { direction: 'end' }` on `response` panel in `wrap` mode returns state unchanged
- [ ] 7.9 Add test: `JUMP_HORIZONTAL { direction: 'end' }` on `requests` panel when content fits (max width ≤ content width) sets `requestHorizontalOffset` to `0`
- [ ] 7.10 Add test: `JUMP_HORIZONTAL { direction: 'end' }` without `columns` defaults to `columns = 80`

## 8. Tests — Shortcut registry

- [ ] 8.1 Add test: `SHORTCUTS` contains a `g` entry with the specified description, `showInBar: false`, `showInHelp: true`
- [ ] 8.2 Add test: `SHORTCUTS` contains a `G` entry with the specified description, `showInBar: false`, `showInHelp: true`
- [ ] 8.3 Add test: `SHORTCUTS` contains a `0` entry with the specified description, `showInBar: false`, `showInHelp: true`
- [ ] 8.4 Add test: `SHORTCUTS` contains a `$` entry with the specified description, `showInBar: false`, `showInHelp: true`
- [ ] 8.5 Verify the StatusBar continues to render exactly the 6 existing bar-visible shortcuts (no regression from the new entries)

## 9. Documentation

- [ ] 9.1 Update the Keyboard Shortcuts table in `README.md` to include rows for `g`, `G`, `0`, `$` with focus-aware action descriptions
- [ ] 9.2 Update the Keyboard Shortcuts reference table in `openspec/specs/tui/spec.md` to include rows for `g`, `G`, `0`, `$`

## 10. Verification

- [ ] 10.1 Run `npm run lint` and confirm no new violations
- [ ] 10.2 Run `npm run build` and confirm a clean build
- [ ] 10.3 Run `npm test` and confirm all tests (including the CLI smoke test) pass
- [ ] 10.4 Manually verify in a running TUI session:
    - `g`/`G` jump selection in the requests list
    - `g`/`G` jump scroll in the details panel (when visible) and response panel
    - `0`/`$` jump horizontal scroll in all three panels
    - `0`/`$` are no-ops on the response panel when wrap mode is on
    - `g`/`G`/`0`/`$` appear in the help overlay and do NOT appear in the status bar
