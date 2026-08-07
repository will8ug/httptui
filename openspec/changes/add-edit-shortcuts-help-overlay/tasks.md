## 1. Registry changes

- [x] 1.1 Add `'edit'` to the `ShortcutGroup` union type in `src/core/shortcuts.ts`
- [x] 1.2 Add `edit: 'Edit'` to `SHORTCUT_GROUP_LABELS` in `src/core/shortcuts.ts`
- [x] 1.3 Add three help-only entries to `SHORTCUTS` in `src/core/shortcuts.ts` — `Ctrl+S` (`Save and close editor`), `Ctrl+A` (`Jump to start of line`), `Ctrl+E` (`Jump to end of line`) — each with `label: ''`, `showInBar: false`, `showInHelp: true`, `group: 'edit'`
- [x] 1.4 Update `HELP_COLUMN_GROUPS` in `src/core/shortcuts.ts` to `[['general', 'navigation', 'edit'], ['request', 'display', 'search']]`

## 2. Tests

- [x] 2.1 Add registry assertions to `test/core/shortcuts.test.ts`: each of the three `edit`-group entries (key, description, `showInBar: false`, `showInHelp: true`, `group: 'edit'`), the `SHORTCUT_GROUP_LABELS.edit` value, exclusion from status bar keys, and the updated `HELP_COLUMN_GROUPS` first element
- [x] 2.2 Add rendering assertions to `test/components/HelpOverlay.test.tsx`: the `Edit` group header and the three shortcut descriptions appear when the overlay is visible

## 3. Verification

- [x] 3.1 Run the test suite and lint/typecheck — confirm all tests pass and no new diagnostics on changed files
