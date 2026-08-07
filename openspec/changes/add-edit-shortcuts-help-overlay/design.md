## Context

httptui centralizes all shortcut definitions in `src/core/shortcuts.ts` — the single source of truth consumed by both StatusBar (filters `showInBar`) and HelpOverlay (filters `showInHelp` and groups by `group`). The body editor already handles `Ctrl+S` (commit/save), `Ctrl+A` (line start), and `Ctrl+E` (line end) in the `state.mode === 'edit'` branch of `app.tsx`, but these keybindings were never registered, so the help overlay omits them. The EditOverlay footer hardcodes a partial hint (`Ctrl+S to save, Esc to cancel`).

The help overlay renders two columns via the `HELP_COLUMN_GROUPS` constant: left = General + Navigation, right = Request + Display + Search. Group headers are cyanBright/bold; shortcut keys render yellow, padded to 8 characters, followed by the white description.

## Goals / Non-Goals

**Goals:**
- Register the three existing editor keybindings in the `SHORTCUTS` registry under a new `edit` group.
- Render the "Edit" group at the bottom of the left column in the help overlay.
- Keep the new entries help-overlay-only (`showInBar: false`), preserving the 6-item status bar budget.

**Non-Goals:**
- No changes to `app.tsx` keybindings — the shortcuts already work.
- No changes to StatusBar or its budget.
- No changes to the EditOverlay footer text.
- No mode-aware help overlay (the Edit group is static documentation, consistent with how other mode-scoped shortcuts like `e` and the edge-jump keys are displayed).

## Decisions

### Decision 1: Extend the existing registry rather than hardcode in HelpOverlay

Add `'edit'` to the `ShortcutGroup` union and `SHORTCUT_GROUP_LABELS`, then append three entries to `SHORTCUTS` with `showInBar: false`, `showInHelp: true`, `group: 'edit'`. HelpOverlay's existing `groupShortcutsByGroup()` and column rendering logic then pick them up with zero component changes.

- **Alternative considered**: hardcoding an "Edit" block in `HelpOverlay.tsx`. Rejected — violates the "No hardcoded shortcut strings" requirement and the centralized-registry design.
- **Consequence**: StatusBar automatically excludes the entries (filters on `showInBar`), satisfying "only the help overlay, nowhere else" without touching the status bar component.

### Decision 2: Place the Edit group at the bottom of the left column via `HELP_COLUMN_GROUPS`

Change `HELP_COLUMN_GROUPS` from `[['general', 'navigation'], ['request', 'display', 'search']]` to `[['general', 'navigation', 'edit'], ['request', 'display', 'search']]`. The renderer iterates column groups in array order, so `edit` renders after Navigation — the left-column bottom.

- **Alternative considered**: a full-width footer row below both columns. Rejected — requires a structural change to the overlay layout (a third region) for a 3-key group; the column approach is a one-line data change.
- **Side effect**: the left column grows by ~5 lines (header + 3 keys + spacer), roughly balancing the existing right-column height (~19 lines vs left ~15 before).

### Decision 3: Compact key notation without spaces

Use `'Ctrl+S'`, `'Ctrl+A'`, `'Ctrl+E'` as key strings, consistent with existing registry keys (`h/j/k/l`, `Enter`, `Escape`). All fit within the existing 8-character yellow padding.

### Decision 4: Descriptions match the actual keybindings

| Key | Binding in `app.tsx` | Description |
|-----|----------------------|-------------|
| `Ctrl+S` | `key.ctrl && input === 's'` → `COMMIT_EDIT` | `Save and close editor` |
| `Ctrl+A` | `key.ctrl && input === 'a'` → `EDIT_KEY op: 'lineStart'` | `Jump to start of line` |
| `Ctrl+E` | `key.ctrl && input === 'e'` → `EDIT_KEY op: 'lineEnd'` | `Jump to end of line` |

## Risks / Trade-offs

- **Naming overlap with existing `e` key** → The Request group's `e` ("Edit request body") *opens* the editor, while the new Edit group describes *in-editor* controls. The distinct headers ("Request" vs "Edit") and descriptions make the separation clear; no change needed.
- **EditOverlay footer duplication** → The footer (`Ctrl+S to save, Esc to cancel`) remains hardcoded, duplicating the new `Ctrl+S` registry entry. Deliberately out of scope per the change's "help overlay only" boundary; a future change could route the footer through the registry.
- **Spec constraint change** → The existing spec mandated `HELP_COLUMN_GROUPS[0] === ['general', 'navigation']`; the delta spec updates this scenario. Archive of this change will supersede the old scenario.
