## 1. Data Layer

- [x] 1.1 Add `HELP_COLUMN_GROUPS` constant to `src/core/shortcuts.ts` — a `readonly ShortcutGroup[][]` with `[['general', 'navigation'], ['request', 'display', 'search']]`
- [x] 1.2 Export `HELP_COLUMN_GROUPS` from the module

## 2. HelpOverlay Layout

- [x] 2.1 Update width calculation in `HelpOverlay.tsx` from `Math.min(72, Math.max(48, ...))` to `Math.min(90, Math.max(64, ...))`
- [x] 2.2 Replace the single-column group iteration with a two-column `Box flexDirection="row"` layout
- [x] 2.3 Render left column (`general`, `navigation`) and right column (`request`, `display`, `search`) using `HELP_COLUMN_GROUPS`
- [x] 2.4 Add spacing between columns (marginRight or gap on left column Box)
- [x] 2.5 Ensure each column uses `flexDirection="column"` and `width="50%"`

## 3. Tests

- [x] 3.1 Update integration tests that assert on help overlay frame content to expect two-column layout
- [x] 3.2 Add or update unit/reducer tests if any exist for help overlay visibility or dimensions
- [x] 3.3 Run full test suite (`npm test`) and fix any failures
