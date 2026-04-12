## 1. Update Shortcut Description

- [ ] 1.1 Change the Escape entry description in `src/core/shortcuts.ts` from `"Close overlay / cancel file load"` to `"Close current overlay"`

## 2. Update Help Overlay Hint Text

- [ ] 2.1 Change the hint text in `src/components/HelpOverlay.tsx` from `"Press Escape or ? to close"` to `"Press Escape or ? to close this overlay"`

## 3. Update TUI Spec

- [ ] 3.1 Update the Escape rows in the keyboard shortcuts table in `openspec/specs/tui/spec.md`: change the Action column from "Close overlay" and "Cancel file load" to "Close current overlay" for both rows
- [ ] 3.2 Update the Help Overlay section in `openspec/specs/tui/spec.md`: change "Closed by pressing `Escape` or `?`" to reflect "Close current overlay" wording