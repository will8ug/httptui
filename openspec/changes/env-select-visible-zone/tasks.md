## 1. Layout constants and helpers

- [ ] 1.1 Add `MAX_ENV_PICKER_VISIBLE = 8` and `ENV_PICKER_VERTICAL_OVERHEAD = 7` constants to `src/utils/layout.ts` (next to `REQUEST_LIST_VERTICAL_OVERHEAD`)
- [ ] 1.2 Add `getEnvPickerVisibleHeight(rows: number): number` helper to `src/utils/layout.ts` returning `Math.min(MAX_ENV_PICKER_VISIBLE, Math.max(1, rows - ENV_PICKER_VERTICAL_OVERHEAD))`
- [ ] 1.3 Verify the overhead constant (border 2 + paddingY 2 + title 1 + spacer 1 + footer 1 = 7) by counting rendered rows in the current overlay at a 24-row terminal

## 2. State and action types

- [ ] 2.1 Add `envSelectScrollOffset: number` field to `AppState` in `src/core/types.ts` (next to `envSelectIndex` at line 122)
- [ ] 2.2 Add `| { type: 'JUMP_ENV_SELECTION'; target: 'top' | 'bottom' }` variant to the `Action` union in `src/core/types.ts` (after `MOVE_ENV_SELECTION` at line 179)

## 3. Reducer logic

- [ ] 3.1 Initialize `envSelectScrollOffset: 0` in `createInitialState` in `src/core/reducer.ts` (next to `envSelectIndex: 0` at line 713)
- [ ] 3.2 Add `envSelectScrollOffset: 0` to the `ENTER_ENV_SELECT` return object in `src/core/reducer.ts` (line 539-544) so the offset resets when the picker opens
- [ ] 3.3 Modify `MOVE_ENV_SELECTION` in `src/core/reducer.ts` (lines 547-558) to compute `visibleCount` from `DEFAULT_TERMINAL_ROWS` via `getEnvPickerVisibleHeight` and apply `getVisibleRequestOffset(nextIndex, state.envSelectScrollOffset, visibleCount)` to the returned `envSelectScrollOffset`
- [ ] 3.4 Add new `JUMP_ENV_SELECTION` case in `src/core/reducer.ts` (after `MOVE_ENV_SELECTION`): set `envSelectIndex` to 0 (top) or `optionCount - 1` (bottom), then apply `getVisibleRequestOffset` to sync `envSelectScrollOffset`; guard `optionCount === 0` early-return
- [ ] 3.5 Add `envSelectScrollOffset: 0` to the `CANCEL_ENV_SELECT` return object in `src/core/reducer.ts` (lines 578-583) so the offset resets on cancel
- [ ] 3.6 Import `getEnvPickerVisibleHeight` (and `MAX_ENV_PICKER_VISIBLE` if needed) from `../utils/layout` at the top of `src/core/reducer.ts`

## 4. Component rendering

- [ ] 4.1 Add `scrollOffset: number` to `EnvSelectOverlayProps` in `src/components/EnvSelectOverlay.tsx`
- [ ] 4.2 Import `getEnvPickerVisibleHeight` and `DEFAULT_TERMINAL_ROWS` from `../utils/layout` in `EnvSelectOverlay.tsx`
- [ ] 4.3 Compute `visibleCount = getEnvPickerVisibleHeight(stdout.rows || DEFAULT_TERMINAL_ROWS)` inside `EnvSelectOverlay`, then `visibleOptions = options.slice(scrollOffset, scrollOffset + visibleCount)`
- [ ] 4.4 Replace the `options.map(...)` (line 37) with `visibleOptions.map(...)` using a computed global index: `visibleOptions.map((option, i) => { const globalIndex = scrollOffset + i; const isHighlighted = selectedIndex === globalIndex; ... })`
- [ ] 4.5 Add `height` prop to the inner `<Box>` (line 25-32) sized to `visibleCount + ENV_PICKER_VERTICAL_OVERHEAD` so the panel reserves the correct vertical space (import the overhead constant)
- [ ] 4.6 Update the footer `<Text>` (line 56) to include the position counter: append ` · {selectedIndex + 1}/{options.length}` and add `g/G` to the key hint text (e.g., `↑↓ move · g/G top/bottom · Enter apply · Esc cancel · {selectedIndex + 1}/{options.length}`)

## 5. Input handling

- [ ] 5.1 In the `state.mode === 'envSelect'` block in `src/app.tsx` (lines 247-287), add `g`/`G` dispatch before the fall-through `return` at line 286: `if (input === 'g') { dispatch({ type: 'JUMP_ENV_SELECTION', target: 'top' }); return; }` and `if (input === 'G') { dispatch({ type: 'JUMP_ENV_SELECTION', target: 'bottom' }); return; }`
- [ ] 5.2 Verify `g`/`G` do NOT leak to the normal-mode `JUMP_VERTICAL` handler — confirm the env-select block returns before the normal-mode key handling runs

## 6. Prop wiring

- [ ] 6.1 Pass `scrollOffset={state.envSelectScrollOffset}` to `<EnvSelectOverlay>` in `src/app.tsx` (locate where the overlay is rendered in the `state.mode === 'envSelect'` conditional)

## 7. Documentation

- [ ] 7.1 Update the "Runtime Environment Switcher" section in `README.md` to mention the visible-zone cap (at most 8 rows) and add `g`/`G` to the navigation keys list
- [ ] 7.2 Verify the `shortcuts` spec / `src/core/shortcuts.ts` does not need a change (the `g`/`G` keys are already documented as panel navigation; env-select reuses them contextually)

## 8. Verification

- [ ] 8.1 Run `npm run build` (or `tsc --noEmit`) and confirm no type errors in the changed files
- [ ] 8.2 Run `lsp_diagnostics` on all 5 changed source files (`layout.ts`, `types.ts`, `reducer.ts`, `EnvSelectOverlay.tsx`, `app.tsx`) and confirm zero errors
- [ ] 8.3 Manually test with 2 environments: overlay shrinks to 2 rows, no empty padding, counter shows `1/3` (including `(none)`)
- [ ] 8.4 Manually test with 15+ environments: overlay shows exactly 8 rows, `j` past the 8th row scrolls the window, counter updates, `g` jumps to top, `G` jumps to bottom
- [ ] 8.5 Manually test on a short terminal (12 rows): overlay shows fewer than 8 rows and does not overflow
- [ ] 8.6 Manually test `Esc` after scrolling: offset resets to 0, re-opening shows from the top
- [ ] 8.7 Run existing test suite (`npm test` if present) and confirm no regressions in env-select-related tests
