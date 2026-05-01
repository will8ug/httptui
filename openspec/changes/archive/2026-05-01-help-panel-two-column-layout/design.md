## Context

The HelpOverlay component (`src/components/HelpOverlay.tsx`) renders all 5 shortcut groups in a single vertical column. With 22 visible shortcuts across 5 groups plus headers and spacing, the panel is ~30+ lines tall. On terminals with ≤30 rows this can overflow.

The current implementation uses Ink `Box` with `flexDirection="column"` and iterates `SHORTCUT_GROUP_ORDER` to render groups sequentially. Each shortcut renders as `key.padEnd(8) + description`.

## Goals / Non-Goals

**Goals:**
- Render shortcut groups in two side-by-side columns to halve vertical height
- Left column: General (3 shortcuts) + Navigation (9 shortcuts) = 12 items
- Right column: Request (3) + Display (4) + Search (3) = 10 items
- Keep the overlay usable on terminals as small as 24 rows × 80 columns
- Maintain the existing visual style (colors, borders, key formatting)

**Non-Goals:**
- Responsive column count (always 2 columns, no single-column fallback)
- Changing shortcut definitions or group membership
- Modifying the StatusBar or any other component
- Making the help overlay scrollable

## Decisions

### 1. Column assignment via constant rather than runtime calculation

Define a `HELP_COLUMN_GROUPS` constant in `shortcuts.ts` that maps each column to its ordered groups:

```typescript
export const HELP_COLUMN_GROUPS: readonly ShortcutGroup[][] = [
  ['general', 'navigation'],   // left column
  ['request', 'display', 'search'],  // right column
];
```

**Rationale**: Explicit over computed. The user specified which groups go where. A constant is easy to reorder later without touching rendering logic. Avoids runtime balancing heuristics that could produce unexpected results when shortcuts are added/removed.

**Alternative considered**: Splitting `SHORTCUT_GROUP_ORDER` in half automatically — rejected because it doesn't respect the user's explicit column assignment and could break when groups change size.

### 2. Two `Box` containers with `flexDirection="row"` at the top level

The layout structure:

```
<Box flexDirection="row" gap={2}>
  <Box flexDirection="column" width="50%">  ← left column groups
  <Box flexDirection="column" width="50%">  ← right column groups
</Box>
```

**Rationale**: Ink's Flexbox model supports `flexDirection="row"` natively. Using percentage widths ensures equal column sizing regardless of overlay width. The `gap` property (or `columnGap`) adds visual separation between columns.

**Alternative considered**: Using a single column with two `Text` nodes per line (tabular approach) — rejected because group headers would be awkward to align and the code would be more complex.

### 3. Increase max overlay width to accommodate two columns

Current: `Math.min(72, Math.max(48, termWidth - 6))`
New: `Math.min(90, Math.max(64, termWidth - 6))`

**Rationale**: Each column needs ~key(8) + space(1) + description(~35) = 44 chars. Two columns + gap(2) + padding(4) + border(2) = ~96 theoretical max. Capping at 90 ensures it fits 80-col terminals with the `Math.max(64, ...)` floor still allowing reasonable display.

**Alternative considered**: Keeping 72 max — rejected because two columns at 36 chars each leave only ~27 chars for descriptions after key padding, which truncates text.

### 4. Keep `SHORTCUT_GROUP_ORDER` for backward compatibility

`SHORTCUT_GROUP_ORDER` remains unchanged (used by other potential consumers). `HELP_COLUMN_GROUPS` is the authoritative source for help overlay rendering order.

## Risks / Trade-offs

- **[Narrow terminals]** → On terminals < 64 cols, the overlay will still render at 64 width (the new minimum). Descriptions may wrap or truncate. Mitigation: This is an edge case; the status bar already assumes ≥ 80 cols.
- **[Ink `gap` support]** → Older Ink versions may not support `gap`. Mitigation: Use `marginRight` on the left column Box as a fallback for spacing.
- **[Test breakage]** → Integration tests asserting on help overlay frame content will need updating. Mitigation: Update tests as part of implementation.
