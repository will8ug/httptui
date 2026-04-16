## Why

The `r` key raw response mode toggle was removed in `2026-04-12-remove-raw-mode-toggle` because it appeared invisible for typical JSON responses. However, the feature is valuable for inspecting minified/compact JSON, debugging response encoding, and viewing raw server output without pretty-printing interference. The README still documents the `r` shortcut — restoring it brings the implementation back in line with the documented behavior.

## What Changes

- **Add** `rawMode` boolean to `AppState` (default: `false`)
- **Add** `TOGGLE_RAW` action to the `Action` discriminated union
- **Add** `TOGGLE_RAW` case to the reducer in `app.tsx`
- **Add** `r` key handler in `useInput` to dispatch `TOGGLE_RAW`
- **Add** `r` shortcut entry to the `SHORTCUTS` array in `shortcuts.ts`
- **Modify** `ResponseView` to accept a `rawMode` prop — when `true`, skip JSON pretty-printing and colorization, render body as-is
- **Modify** response panel title to indicate raw mode (e.g., `Response [raw]`)

## Capabilities

### New Capabilities

_(None — restoring a previously existing capability)_

### Modified Capabilities

- `tui`: Add `r` keyboard shortcut and `rawMode` state to the TUI interface spec. When raw mode is active, response body renders as plain text without JSON formatting or colorization.

## Impact

- `src/core/types.ts` — Add `rawMode` to `AppState`, `TOGGLE_RAW` to `Action`
- `src/core/shortcuts.ts` — Add `r` entry to `SHORTCUTS` array
- `src/app.tsx` — Add `TOGGLE_RAW` reducer case, `r` key handler, `rawMode` initial state, pass `rawMode` prop to `ResponseView`
- `src/components/ResponseView.tsx` — Add `rawMode` prop, skip JSON colorization when active, update panel title
- `openspec/specs/tui/spec.md` — Add `r` to keyboard shortcuts table and document raw mode behavior
