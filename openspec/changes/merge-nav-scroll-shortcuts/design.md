## Context

The status bar in httptui displays keyboard shortcut hints derived from the `SHORTCUTS` array in `src/core/shortcuts.ts`. Currently, two separate entries appear for navigation:
- `[j/k] Nav` — vertical navigation (up/down through requests)
- `[←/→] Scroll` — horizontal scrolling (left/right within panels)

The actual key bindings already support vim-style h/j/k/l for all four directions (lines 16–19 of shortcuts.ts), but the status bar only advertises j/k and ←/→. The `StatusBar.tsx` component renders dynamically by filtering `showInBar: true` entries and joining them as `[key] label` pairs — no hardcoded strings.

## Goals / Non-Goals

**Goals:**
- Merge the two status bar entries into a single `[h/j/k/l] Nav` entry
- Reduce status bar width consumption (one fewer shortcut block frees ~12 characters)
- Present a consistent vim-style navigation model to users

**Non-Goals:**
- Changing any actual key bindings or navigation behavior
- Modifying the help overlay (individual key descriptions remain as-is)
- Changing StatusBar.tsx or HelpOverlay.tsx component code (they render from data)

## Decisions

**Decision 1: Merge at data level, not component level**

Modify only the `SHORTCUTS` array entries in `src/core/shortcuts.ts`. Since `StatusBar.tsx` dynamically renders from `SHORTCUTS.filter(s => s.showInBar)`, changing the data is sufficient — no component code changes needed.

_Alternative considered_: Adding merge logic in StatusBar.tsx to combine entries at render time. Rejected because it adds unnecessary complexity when a simple data change accomplishes the same result.

**Decision 2: Replace two entries with one combined entry**

Replace:
```ts
{ key: 'j/k', label: 'Nav', ... showInBar: true },
{ key: '←/→', label: 'Scroll', ... showInBar: true },
```

With:
```ts
{ key: 'h/j/k/l', label: 'Nav', description: 'Navigate requests and scroll panels', showInBar: true },
```

The old `←/→` entry becomes `showInBar: false` (or is removed) since its functionality is now represented by the merged entry.

_Alternative considered_: Using `[←/↓/↑/→] Nav` with arrow symbols. Rejected because h/j/k/l is more concise, the app is already vim-oriented, and arrow keys are still documented in the help overlay.

**Decision 3: Keep individual h/l entries in help overlay**

The detailed per-key entries (← / h, → / l, ↑ / k, ↓ / j) with `showInBar: false` remain unchanged. The help overlay continues to show each key with its specific description.

## Risks / Trade-offs

- **[Discoverability of arrow keys]** → Users who don't know vim keys might not realize ←/→ still works. Mitigated by the help overlay (`?`) which still lists all individual key bindings including arrow keys.
- **[Status bar width]** → `[h/j/k/l] Nav` is slightly wider than `[j/k] Nav` alone (net gain is still positive since we remove `[←/→] Scroll` entirely). No truncation risk — we save ~4 characters net.
