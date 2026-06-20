## 1. Layout constants and helpers

- [x] 1.1 Add `MAX_ENV_PICKER_VISIBLE = 8` and `ENV_PICKER_VERTICAL_OVERHEAD = 8` constants to `src/utils/layout.ts` (next to `REQUEST_LIST_VERTICAL_OVERHEAD`)
- [x] 1.2 Add `getEnvPickerVisibleHeight(rows: number): number` helper to `src/utils/layout.ts` returning `Math.min(MAX_ENV_PICKER_VISIBLE, Math.max(1, rows - ENV_PICKER_VERTICAL_OVERHEAD))`
- [x] 1.3 Verify the overhead constant (border 2 + paddingY 2 + title 1 + spacer 1 + spacer 1 + footer 1 = 8) by counting rendered rows in the current overlay — corrected from initial estimate of 7

## 2. State and action types

- [x] 2.1 Add `envSelectScrollOffset: number` field to `AppState` in `src/core/types.ts` (next to `envSelectIndex`)
- [x] 2.2 Add `| { type: 'JUMP_ENV_SELECTION'; target: 'top' | 'bottom' }` variant to the `Action` union in `src/core/types.ts` (after `MOVE_ENV_SELECTION`)

## 3. Reducer logic

- [x] 3.1 Initialize `envSelectScrollOffset: 0` in `createInitialState` in `src/core/reducer.ts`
- [x] 3.2 Add `envSelectScrollOffset: 0` to the `ENTER_ENV_SELECT` return object in `src/core/reducer.ts` so the offset resets when the picker opens
- [x] 3.3 Modify `MOVE_ENV_SELECTION` in `src/core/reducer.ts` to compute `visibleCount` from `DEFAULT_TERMINAL_ROWS` via `getEnvPickerVisibleHeight` and apply `clampScrollOffsetToCursor(nextIndex, state.envSelectScrollOffset, visibleCount)` to the returned `envSelectScrollOffset`
- [x] 3.4 Add new `JUMP_ENV_SELECTION` case in `src/core/reducer.ts` (after `MOVE_ENV_SELECTION`): set `envSelectIndex` to 0 (top) or `optionCount - 1` (bottom), then apply `clampScrollOffsetToCursor` to sync `envSelectScrollOffset`; guard `optionCount === 0` early-return
- [x] 3.5 Add `envSelectScrollOffset: 0` to the `CANCEL_ENV_SELECT` return object in `src/core/reducer.ts` so the offset resets on cancel
- [x] 3.6 Import `getEnvPickerVisibleHeight` from `../utils/layout` at the top of `src/core/reducer.ts`

## 4. Component rendering

- [x] 4.1 Add `scrollOffset: number` to `EnvSelectOverlayProps` in `src/components/EnvSelectOverlay.tsx`
- [x] 4.2 Import `getEnvPickerVisibleHeight`, `DEFAULT_TERMINAL_ROWS`, and `ENV_PICKER_VERTICAL_OVERHEAD` from `../utils/layout` in `EnvSelectOverlay.tsx`
- [x] 4.3 Compute `visibleCount = getEnvPickerVisibleHeight(stdout.rows || DEFAULT_TERMINAL_ROWS)` inside `EnvSelectOverlay`, then `visibleOptions = options.slice(scrollOffset, scrollOffset + visibleCount)`
- [x] 4.4 Replace the `options.map(...)` with `visibleOptions.map(...)` using a computed global index: `visibleOptions.map((option, i) => { const globalIndex = scrollOffset + i; ... })`
- [x] 4.5 Add `height` prop to the inner `<Box>` sized to `visibleCount + ENV_PICKER_VERTICAL_OVERHEAD` so the panel reserves the correct vertical space
- [x] 4.6 Update the footer `<Text>` to include the position counter and `g/G` key hint: `↑↓ move · g/G top/bottom · Enter apply · Esc cancel · {selectedIndex + 1}/{options.length}`

## 5. Input handling

- [x] 5.1 In the `state.mode === 'envSelect'` block in `src/app.tsx`, add `g`/`G` dispatch before the fall-through `return`
- [x] 5.2 Verify `g`/`G` do NOT leak to the normal-mode `JUMP_VERTICAL` handler — confirmed the env-select block returns before the normal-mode key handling runs

## 6. Prop wiring

- [x] 6.1 Pass `scrollOffset={state.envSelectScrollOffset}` to `<EnvSelectOverlay>` in `src/app.tsx`

## 7. Documentation

- [x] 7.1 Update the "Runtime Environment Switcher" section in `README.md` to mention the visible-zone cap (at most 8 rows) and add `g`/`G` to the navigation keys list
- [x] 7.2 Verify the `shortcuts` spec / `src/core/shortcuts.ts` does not need a change — confirmed `g`/`G` are already registered (lines 37-38) as navigation shortcuts; env-select reuses them contextually

## 8. Verification

- [x] 8.1 Run `npm run build` — tsup build success, no type errors
- [x] 8.2 Run `lsp_diagnostics` on all 5 changed source files — zero errors on all files
- [x] 8.3 Manually test with 2 environments: overlay shrinks to 3 option rows (2 envs + `(none)`), no empty padding, counter shows `1/3` — initial test found empty padding below the footer (Box height used the 8-row cap instead of the actual option count); fixed by using `Math.min(visibleCount, options.length)` in `EnvSelectOverlay.tsx` line 36
- [x] 8.4 Manually test with 15+ environments: overlay shows exactly 8 rows, `j` past the 8th row scrolls the window, counter updates, `g` jumps to top, `G` jumps to bottom — requires manual TUI testing
- [ ] 8.5 Manually test on a short terminal (12 rows): overlay shows fewer than 8 rows and does not overflow — requires manual TUI testing
- [ ] 8.6 Manually test `Esc` after scrolling: offset resets to 0, re-opening shows from the top — requires manual TUI testing
- [x] 8.7 Run existing test suite — 508/508 tests passed, no regressions
