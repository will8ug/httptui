## Context

The TUI has two independent shortcut definitions:
- `StatusBar.tsx` line 39: a hardcoded string `'[Enter] Send  [j/k] Nav  [Tab] Panel  [v] Verbose  [o] Open  [R] Reload  [q] Quit'` with 7 items.
- `HelpOverlay.tsx` lines 8-20: a `SHORTCUTS` tuple array with 11 items.

These can drift apart (e.g., `r` for raw mode is in the help overlay but not the status bar). The status bar has grown from 5 to 7 items organically and will keep growing. The key bindings in `app.tsx` are a third implicit source of truth.

## Goals / Non-Goals

**Goals:**
- Establish a single source of truth for all keyboard shortcut definitions.
- Reduce the status bar to exactly 6 items, with `?` as the last item.
- Make it trivial to add new shortcuts without touching UI component code.
- Keep all current keyboard bindings unchanged.

**Non-Goals:**
- Context-sensitive status bar (different shortcuts per mode/overlay).
- Reordering or changing existing key bindings.
- Adding new shortcuts or commands.
- Changing the visual format of shortcut hints (keep `[key] Action`).

## Decisions

### 1. Shortcut data structure

**Decision**: Define a `Shortcut` interface with `key`, `label`, `description`, and `showInBar` fields. Store all shortcuts in a single exported `SHORTCUTS` array in `src/core/shortcuts.ts`.

```
interface Shortcut {
  key: string;          // Display key for status bar (e.g., "Enter", "j/k", "?")
  label: string;        // Short label for status bar (e.g., "Send", "Nav", "Help")
  description: string;  // Full description for help overlay (e.g., "Send selected request")
  showInBar: boolean;   // Whether to show in the status bar
}
```

**Rationale**: Simple, flat structure. No hierarchy needed — there are only ~11 shortcuts. The `showInBar` boolean is the only "visibility" flag we need. No need for a more complex system.

**Alternative considered**: A `barPriority` number for ordering. Rejected — explicit ordering in the array is clearer and easier to reorder.

### 2. Status bar item ordering

**Decision**: `[Enter] Send  [j/k] Nav  [Tab] Panel  [v] Verbose  [q] Quit  [?] Help`

**Rationale**: `?` at the far right, after `q`. The status bar reads left-to-right as "actions you take constantly → actions you take rarely". `?` as the last item is a persistent tail-end reminder that more shortcuts exist.

### 3. Rendering approach

**Decision**: `StatusBar.tsx` filters `shortcuts.filter(s => s.showInBar)` and joins with `'  '` (double space). `HelpOverlay.tsx` maps over all shortcuts using `key` + `description`.

**Rationale**: Direct rendering from data. The status bar format `[key] label` is derived from the `key` and `label` fields, not hardcoded. This eliminates the hardcoded string and the `SHORTCUTS` tuple array in HelpOverlay.

### 4. Help overlay display key vs status bar display key

**Decision**: Use separate `key` (for status bar) and `description` (for help overlay) fields. The help overlay shows `key` (padded) + `description`. The status bar shows `[key] label`.

Some shortcuts have different display needs:
- Status bar: `[j/k] Nav` — compact
- Help overlay: `↑ / k    Previous request or scroll up` — descriptive

The `label` field serves the status bar. The `description` field serves the help overlay. The `key` field is shared.

**Alternative considered**: Single display string per shortcut. Rejected — status bar and help overlay have different formatting needs.

## Risks / Trade-offs

- **Risk**: Double-space separator may not match the exact visual of the current hardcoded string. → **Mitigation**: The format `[key] label  [key] label` is already what we have. Using data-driven rendering produces the same output.
- **Risk**: Adding a shortcut requires updating `shortcuts.ts` but forgetting to add the key handler in `app.tsx`. → **Mitigation**: This is an existing risk already (HelpOverlay and app.tsx can drift). The new central file makes it easier to audit. A future improvement could add an action field to the Shortcut type for reference.
- **Risk**: Truncation behavior changes subtly. → **Mitigation**: Existing `truncateText` logic stays the same. It operates on the rendered string, just like before.