## 1. Remove rawMode from types and state

- [ ] 1.1 Remove `rawMode` from the `AppState` interface in `src/core/types.ts`
- [ ] 1.2 Remove `rawMode: false` from initial state in `src/app.tsx`
- [ ] 1.3 Remove the `TOGGLE_RAW` case from the reducer in `src/app.tsx`
- [ ] 1.4 Remove the `r` key handler (`if (input === 'r')`) in `src/app.tsx`
- [ ] 1.5 Remove the `rawMode` prop passed to `ResponseView` in `src/app.tsx`

## 2. Remove rawMode from rendering

- [ ] 2.1 Remove `rawMode` from `ResponseViewProps` and destructuring in `src/components/ResponseView.tsx`
- [ ] 2.2 Simplify `formatResponseBody` call in `ResponseView.tsx` to remove the `rawMode` argument

## 3. Simplify formatResponseBody

- [ ] 3.1 Remove the `raw` parameter from `formatResponseBody` in `src/core/formatter.ts` — always attempt JSON pretty-printing

## 4. Remove shortcut definition

- [ ] 4.1 Remove the `r` entry from the `SHORTCUTS` array in `src/core/shortcuts.ts`

## 5. Update TUI spec

- [ ] 5.1 Remove the `r` row from the keyboard shortcuts table in `openspec/specs/tui/spec.md`
- [ ] 5.2 Remove any raw mode references from the Help Overlay section in `openspec/specs/tui/spec.md`
- [ ] 5.3 Remove the `r` shortcut from the existing archived change spec if referenced in `openspec/specs/shortcuts/spec.md`