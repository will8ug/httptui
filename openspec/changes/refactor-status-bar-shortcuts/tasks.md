## 1. Data Layer

- [ ] 1.1 Create `src/core/shortcuts.ts` with the `Shortcut` interface (`key`, `label`, `description`, `showInBar`) and the `SHORTCUTS` array containing all 11 shortcuts in status bar display order
- [ ] 1.2 Verify the `SHORTCUTS` array matches the 6 bar items (`Enter`, `j/k`, `Tab`, `v`, `q`, `?` with `showInBar: true`) and the 5 hidden items (`↑ / k`, `↓ / j`, `r`, `o`, `R`, `Escape` with `showInBar: false`)

## 2. UI Components

- [ ] 2.1 Refactor `src/components/StatusBar.tsx` to import `SHORTCUTS` and render the status bar hint string from `SHORTCUTS.filter(s => s.showInBar)` joined with double spaces, replacing the hardcoded `leftText` string
- [ ] 2.2 Refactor `src/components/HelpOverlay.tsx` to import `SHORTCUTS` and render from it, replacing the local `SHORTCUTS` tuple array. Each entry shows `key` (padded to 8 chars, yellow) + `description` (white)
- [ ] 2.3 Verify StatusBar renders as `[Enter] Send  [j/k] Nav  [Tab] Panel  [v] Verbose  [q] Quit  [?] Help` and truncation with `truncateText` still works
- [ ] 2.4 Verify HelpOverlay renders all 11 shortcuts with the same visual format as before (key in yellow, description in white)

## 3. Spec Update

- [ ] 3.1 Update `openspec/specs/tui/spec.md` to reflect the new status bar layout (`[Enter] Send  [j/k] Nav  [Tab] Panel  [v] Verbose  [q] Quit  [?] Help`) and note that shortcut data comes from the centralized shortcuts source

## 4. Validation

- [ ] 4.1 Run TypeScript build (`npm run build` or equivalent) and confirm no type errors in `shortcuts.ts`, `StatusBar.tsx`, or `HelpOverlay.tsx`
- [ ] 4.2 Run existing tests and confirm all pass