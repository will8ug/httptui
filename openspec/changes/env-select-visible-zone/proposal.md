## Why

The environment picker overlay renders every available environment with no height cap. Users with many configured environments see the overlay overflow the terminal, pushing the footer hint and active env rows off-screen. The picker also lacks jump-to-top/bottom (`g`/`G`) and gives no position feedback in long lists, making navigation tedious. This change caps the visible zone, adds cursor-chase scrolling, and brings the picker's navigation to parity with the request list.

## What Changes

- Cap the environment picker's visible zone to at most 8 options (including `(none)`), shrinking to fit when fewer environments are available.
- Derive the effective cap from terminal height so the panel never overflows short terminals: `min(8, rows - ENV_PICKER_VERTICAL_OVERHEAD)`.
- Add cursor-chase scrolling: as the highlight moves past the visible window, the window shifts to keep the highlight in view (reusing the existing `clampScrollOffsetToCursor` helper).
- Add `g` / `G` to jump the highlight to the first / last option, mirroring the request list's `JUMP_VERTICAL` behavior.
- Add a compact `{selectedIndex + 1}/{total}` position counter to the picker footer.
- Update the footer hint to document `g`/`G` alongside the existing `↑↓`/`Enter`/`Esc` hints.
- Environment ordering is unchanged — config-file order with `--env` appended, `(none)` always first.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `runtime-environment-switching`: The "Environment picker overlay" requirement gains a visible-zone cap (max 8, terminal-aware) and a position counter in the footer. The "Environment picker navigation and selection" requirement gains cursor-chase scrolling and `g`/`G` jump-to-end navigation.

## Impact

- **`src/utils/layout.ts`** — new constants and helper: `ENV_PICKER_VERTICAL_OVERHEAD`, `MAX_ENV_PICKER_VISIBLE = 8`, `getEnvPickerVisibleHeight(rows)`.
- **`src/core/types.ts`** — new `envSelectScrollOffset: number` state field; new `JUMP_ENV_SELECTION { target: 'top' | 'bottom' }` action variant.
- **`src/core/reducer.ts`** — `ENTER_ENV_SELECT` and `CANCEL_ENV_SELECT` reset `envSelectScrollOffset`; `MOVE_ENV_SELECTION` applies `clampScrollOffsetToCursor`; new `JUMP_ENV_SELECTION` case; `createInitialState` initializes the new field.
- **`src/components/EnvSelectOverlay.tsx`** — accepts `scrollOffset` prop; slices options to the visible window; sets an explicit `height` on the inner Box; adds the position counter and `g`/`G` to the footer.
- **`src/app.tsx`** — env-select input block dispatches `JUMP_ENV_SELECTION` for `g` / `G`.
- **`README.md`** — environment switcher section gains a note about the visible-zone cap and `g`/`G` keys.
- No new dependencies. No breaking changes to existing behavior — the picker only renders fewer rows when environments exceed the cap.
