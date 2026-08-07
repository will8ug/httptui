## Why

The body editor's keybindings (`Ctrl+S` to save, `Ctrl+A` to jump to line start, `Ctrl+E` to jump to line end) are implemented in `app.tsx` but missing from the centralized `SHORTCUTS` registry, so the help overlay does not document them. Users have no discoverable way to learn these editor controls — the only hint is a hardcoded footer in the EditOverlay itself.

## What Changes

- Add a new `edit` shortcut group ("Edit") to the `ShortcutGroup` union and `SHORTCUT_GROUP_LABELS` in `src/core/shortcuts.ts`.
- Add three registry entries for the existing in-editor keybindings, all with `showInBar: false` and `showInHelp: true` so they appear **only** in the help overlay and never in the status bar:
  - `Ctrl+S` — Save and close editor
  - `Ctrl+A` — Jump to start of line
  - `Ctrl+E` — Jump to end of line
- Update `HELP_COLUMN_GROUPS` so the `edit` group renders at the **bottom of the left column** (after General and Navigation): `[['general', 'navigation', 'edit'], ['request', 'display', 'search']]`.
- No changes to `app.tsx` keybindings, StatusBar, or the EditOverlay footer — the shortcuts already function; this change is documentation-only.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `shortcuts`: The centralized registry gains a new `edit` group and three help-only entries (`Ctrl+S`, `Ctrl+A`, `Ctrl+E`), and `HELP_COLUMN_GROUPS` changes from `[['general', 'navigation'], ['request', 'display', 'search']]` to `[['general', 'navigation', 'edit'], ['request', 'display', 'search']]`.

## Impact

- `src/core/shortcuts.ts` — new group type/label, three registry entries, updated column constant.
- `openspec/specs/shortcuts/spec.md` — column-constant scenario updated; new registry-entry and placement scenarios added.
- `test/core/shortcuts.test.ts` — new assertions for the `edit` group entries and column constant.
- `test/components/HelpOverlay.test.tsx` — rendering assertions for the Edit group.
- StatusBar and keybinding handling are intentionally **unaffected** (`showInBar: false` filters the new entries out of the status bar).
