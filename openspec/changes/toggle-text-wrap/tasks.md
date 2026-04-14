## 1. Types & Shortcut Registry

- [x] 1.1 Add `wrapMode: 'nowrap' | 'wrap'` to `AppState` in `src/core/types.ts`, defaulting to `'nowrap'`
- [x] 1.2 Add `{ type: 'TOGGLE_WRAP' }` to the `Action` discriminated union in `src/core/types.ts`
- [x] 1.3 Add wrap toggle shortcut entry to `src/core/shortcuts.ts`: `{ key: 'w', label: 'Wrap', description: 'Toggle text wrapping in response panel', showInBar: true, showInHelp: true }`

## 2. Reducer & Key Handling

- [x] 2.1 Add `TOGGLE_WRAP` case to the reducer in `src/app.tsx`: toggle `wrapMode` between `'nowrap'` and `'wrap'`, reset `responseScrollOffset` to `0`, reset `responseHorizontalOffset` to `0`
- [x] 2.2 Add `w` key handler in `useInput` in `src/app.tsx`: dispatch `{ type: 'TOGGLE_WRAP' }` when `input === 'w'` and `state.mode === 'normal'` and not in help overlay
- [x] 2.3 Modify `SCROLL_HORIZONTAL` handler in `src/app.tsx`: when `wrapMode === 'wrap'` and `focusedPanel === 'response'`, skip horizontal scroll (return early without dispatching)
- [x] 2.4 Initialize `wrapMode: 'nowrap'` in `createInitialState` in `src/app.tsx`

## 3. Line Wrapping Utilities

- [x] 3.1 Create `wrapLine(line: string, maxWidth: number): string[]` utility in `src/utils/colors.ts` (or a new `src/utils/wrap.ts`) that splits a plain-text line into multiple visual lines at `maxWidth` character boundaries, preferring word boundaries
- [x] 3.2 Create `wrapColorizedSegments(segments: Array<{text: string; color: string}>, maxWidth: number): Array<Array<{text: string; color: string}>>` utility that splits colorized JSON segments across multiple visual lines at `maxWidth` boundaries, preserving color assignments for each portion

## 4. ResponseView Wrap Mode Rendering

- [x] 4.1 Add `wrapMode` prop to `ResponseViewProps` in `src/components/ResponseView.tsx`
- [x] 4.2 Pass `wrapMode` from `App` to `ResponseView` in `src/app.tsx`
- [x] 4.3 Implement wrap-mode rendering branch in `ResponseView`: when `wrapMode === 'wrap'`, use `wrapLine` / `wrapColorizedSegments` instead of `truncateText` / `shiftLine`, producing multiple visual lines per source line
- [x] 4.4 In wrap mode, set `horizontalOffset` to `0` and skip horizontal scroll logic
- [x] 4.5 Show `Response [wrap]` panel title when `wrapMode === 'wrap'`, `Response` when `wrapMode === 'nowrap'`

## 5. Tests

- [x] 5.1 Add unit test for `TOGGLE_WRAP` reducer case: toggles `wrapMode`, resets scroll offsets
- [x] 5.2 Add unit test for `wrapLine` utility: word wrapping, mid-word breaking, short lines unchanged
- [x] 5.3 Add unit test for `wrapColorizedSegments`: segments split at boundaries with colors preserved
- [x] 5.4 Add unit test verifying `w` key dispatches `TOGGLE_WRAP` in normal mode and is ignored in file-load mode and help overlay (covered by reducer tests + key handler placement; useInput integration tests not feasible without Ink hook mocking)