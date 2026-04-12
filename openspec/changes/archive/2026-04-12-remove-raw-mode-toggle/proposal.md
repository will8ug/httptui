## Why

The `r` key toggles "raw mode" for response body rendering, but its effect is invisible for most common APIs (which return already-formatted JSON). With no visual indicator that raw mode is active and no visible change when toggling it for typical responses, the feature provides no user value while adding code complexity and keyboard shortcut clutter.

## What Changes

- **Remove** the `r` keyboard shortcut from the `SHORTCUTS` array
- **Remove** the `rawMode` boolean from `AppState`
- **Remove** the `TOGGLE_RAW` action from the reducer
- **Remove** the `raw` parameter from `formatResponseBody` — preserve existing default behavior (attempt JSON pretty-printing, fall back to as-is)
- **Remove** the `rawMode` prop from `ResponseView`
- **Remove** all references to raw mode from the TUI spec (keyboard shortcuts table, shortcut list)
- **Remove** the `r` shortcut from the help overlay listing

## Capabilities

### New Capabilities

_(None)_

### Modified Capabilities

- `tui`: Remove the `r` keyboard shortcut and `rawMode` state from the TUI interface spec. Response body rendering preserves existing behavior (pretty-print JSON, pass through non-JSON unchanged).

## Impact

- `src/core/shortcuts.ts` — Remove `r` entry from `SHORTCUTS` array
- `src/core/types.ts` — Remove `rawMode` from `AppState`
- `src/core/formatter.ts` — Remove `raw` parameter from `formatResponseBody`
- `src/app.tsx` — Remove `TOGGLE_RAW` case from reducer, `r` key handler, `rawMode` initial state, and `rawMode` prop
- `src/components/ResponseView.tsx` — Remove `rawMode` prop, simplify `formatResponseBody` call
- `openspec/specs/tui/spec.md` — Remove `r` from keyboard shortcuts table and help overlay spec