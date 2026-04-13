## 1. Shortcut Registry Update

- [ ] 1.1 In `src/core/shortcuts.ts`, replace the `{ key: 'j/k', label: 'Nav', description: 'Next request or scroll down', showInBar: true }` entry with `{ key: 'h/j/k/l', label: 'Nav', description: 'Navigate requests and scroll panels', showInBar: true }`
- [ ] 1.2 In `src/core/shortcuts.ts`, change the `{ key: '←/→', label: 'Scroll', ... showInBar: true }` entry to `showInBar: false` (keep it for help overlay reference, or remove if redundant with existing ← / h and → / l entries)

## 2. Verification

- [ ] 2.1 Run `npx vitest run` and confirm all existing tests pass (no test changes expected — this is a data-only change)
- [ ] 2.2 Run `npx tsc --noEmit` and confirm no type errors
- [ ] 2.3 Verify the status bar renders `[h/j/k/l] Nav` and does NOT render `[←/→] Scroll` by inspecting `StatusBar.tsx` rendering logic against the updated SHORTCUTS array
