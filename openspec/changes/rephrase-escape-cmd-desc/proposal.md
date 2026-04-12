## Why

The Escape key currently has the description "Close overlay / cancel file load" in the `SHORTCUTS` array. This description conflates two different actions (closing overlays vs. cancelling file load) and uses generic wording ("overlay" without context). Rephrasing it to "Close current overlay" makes the description clearer, more consistent with how the Escape key is described in the help overlay hint ("Press Escape or ? to close"), and better reflects the mental model users have for the Escape key.

## What Changes

- Change the `description` field of the Escape shortcut entry in `SHORTCUTS` from `"Close overlay / cancel file load"` to `"Close current overlay"`
- Update the TUI spec to reflect the rephrased description in the keyboard shortcuts table
- Update the HelpOverlay hint text from "Press Escape or ? to close" to "Press Escape or ? to close this overlay" for consistency

## Capabilities

### New Capabilities

_(None)_

### Modified Capabilities

- `tui`: The description of the Escape key in the keyboard shortcuts table and shortcut data source is changing from "Close overlay / cancel file load" to "Close current overlay". The help overlay hint text is also updated for consistency.

## Impact

- `src/core/shortcuts.ts` — Escape entry description string
- `src/components/HelpOverlay.tsx` — Hint text at bottom of overlay
- `openspec/specs/tui/spec.md` — Keyboard shortcuts table entries for Escape