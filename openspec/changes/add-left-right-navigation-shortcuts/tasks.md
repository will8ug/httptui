## 1. State & Action Types

- [ ] 1.1 Add `requestHorizontalOffset: number` and `responseHorizontalOffset: number` fields to `AppState` in `src/core/types.ts`, both initialized to `0` in `createInitialState`
- [ ] 1.2 Add `SCROLL_HORIZONTAL` action type with `direction: 'left' | 'right'` to the `Action` union in `src/core/types.ts`

## 2. Reducer Logic

- [ ] 2.1 Add `SCROLL_HORIZONTAL` case to `reducer` in `src/app.tsx`: when direction is `'right'`, increment the focused panel's horizontal offset by `2`; when `'left'`, decrement by `2` clamped to `0`
- [ ] 2.2 Reset `requestHorizontalOffset` to `0` in `SELECT_REQUEST` and `MOVE_SELECTION` reducer cases
- [ ] 2.3 Reset `responseHorizontalOffset` to `0` in `SEND_REQUEST` reducer case

## 3. Key Input Handling

- [ ] 3.1 Add `←`/`h` key handling in `useInput` callback in `src/app.tsx` to dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'left' }` when not in overlay mode
- [ ] 3.2 Add `→`/`l` key handling in `useInput` callback in `src/app.tsx` to dispatch `{ type: 'SCROLL_HORIZONTAL', direction: 'right' }` when not in overlay mode

## 4. Component Updates

- [ ] 4.1 Add `horizontalOffset: number` prop to `RequestListProps` interface in `src/components/RequestList.tsx` and apply it to render each line as a substring starting at the offset, truncated to panel width
- [ ] 4.2 Add `horizontalOffset: number` prop to `ResponseViewProps` interface in `src/components/ResponseView.tsx` and apply it to render each content line as a substring starting at the offset, truncated to content width
- [ ] 4.3 Update `App` render to pass `horizontalOffset={state.requestHorizontalOffset}` to `RequestList` and `horizontalOffset={state.responseHorizontalOffset}` to `ResponseView`

## 5. Shortcuts Registry

- [ ] 5.1 Add `←/h` and `→/l` shortcut entries to the `SHORTCUTS` array in `src/core/shortcuts.ts` with `showInBar: true`, labels `←` and `→`, and descriptions "Scroll left" and "Scroll right"

## 6. Verification

- [ ] 6.1 Verify `npm run build` succeeds with no type errors
- [ ] 6.2 Verify `npm test` passes (existing tests still pass)