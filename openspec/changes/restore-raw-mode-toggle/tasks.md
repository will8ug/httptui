## 1. Add rawMode to types and state

- [x] 1.1 Add `rawMode: boolean` to the `AppState` interface in `src/core/types.ts`
- [x] 1.2 Add `| { type: 'TOGGLE_RAW' }` to the `Action` type union in `src/core/types.ts`

## 2. Add rawMode to reducer and key handler

- [x] 2.1 Add `rawMode: false` to initial state in `createInitialState()` in `src/app.tsx`
- [x] 2.2 Add `TOGGLE_RAW` case to the reducer in `src/app.tsx` — toggle `rawMode` boolean
- [x] 2.3 Add `r` key handler in `useInput` callback in `src/app.tsx` — dispatch `{ type: 'TOGGLE_RAW' }` (place next to `v`/`w`/`d` toggle handlers)
- [x] 2.4 Pass `rawMode={state.rawMode}` prop to `<ResponseView>` in `src/app.tsx`

## 3. Add rawMode to ResponseView rendering

- [x] 3.1 Add `rawMode: boolean` to `ResponseViewProps` interface in `src/components/ResponseView.tsx`
- [x] 3.2 Add `rawMode` to destructured props in the `ResponseView` function signature
- [x] 3.3 When `rawMode` is `true`, skip JSON detection and colorization — render body lines as plain `<Text>` elements (apply across all three rendering branches: wrap, horizontal-scroll, default)
- [x] 3.4 Update panel title to show `Response [raw]` when `rawMode` is `true`, `Response [raw] [wrap]` when both `rawMode` and `wrapMode === 'wrap'` are active

## 4. Add shortcut definition

- [x] 4.1 Add `{ key: 'r', label: 'Raw', description: 'Toggle raw response mode (no JSON formatting)', showInBar: false, showInHelp: true }` to the `SHORTCUTS` array in `src/core/shortcuts.ts` (place after the `v` verbose entry)

## 5. Update TUI spec

- [x] 5.1 Add `r` row to the keyboard shortcuts table in `openspec/specs/tui/spec.md`
- [x] 5.2 Add raw mode documentation to the Response Panel section in `openspec/specs/tui/spec.md`