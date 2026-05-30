## 1. State & Types

- [x] 1.1 Add `maximizedPanel: FocusedPanel | null` to `AppState` interface in `src/core/types.ts`, default value `null` in `createInitialState`
- [x] 1.2 Add `TOGGLE_FULLSCREEN` action type to the `Action` union in `src/core/types.ts`
- [x] 1.3 Add `TOGGLE_FULLSCREEN` reducer case in `src/core/reducer.ts`: toggle `maximizedPanel` between `null` and the current `focusedPanel`, reset horizontal scroll offset for the toggled panel

## 2. Shortcut Registry

- [x] 2.1 Add fullscreen shortcut entry to `SHORTCUTS` array in `src/core/shortcuts.ts`: `{ key: 'f', label: '', description: 'Toggle fullscreen', showInBar: false, showInHelp: true, group: 'display' }`
- [x] 2.2 Update `shortcuts.test.ts` to assert the `f` entry exists with description `'Toggle fullscreen'`

## 3. Keyboard Input Handling

- [x] 3.1 Add `f` key handler in `src/app.tsx` `useInput` block: dispatch `TOGGLE_FULLSCREEN` when no overlay is open and mode is `normal`
- [x] 3.2 Add `Escape` key handler for exiting fullscreen: in normal mode, after the overlay and search mode handlers but before the "clear search results" handler, if `state.maximizedPanel !== null` dispatch `TOGGLE_FULLSCREEN`
- [x] 3.3 Guard `Tab` key handler: only dispatch `SWITCH_PANEL` when `state.maximizedPanel === null`
- [x] 3.4 Guard `d` key handler: only dispatch `TOGGLE_REQUEST_DETAILS` when `state.maximizedPanel !== 'details'`

## 4. Layout Rendering

- [x] 4.1 Add `maximizedPanel` prop to `Layout` component in `src/components/Layout.tsx`, with conditional rendering: when set, render only the maximized panel at full width/height plus the status bar; when `null`, render normal split layout
- [x] 4.2 Update `Layout` props interface and `App` component in `src/app.tsx` to pass `state.maximizedPanel` to `Layout`
- [x] 4.3 When `maximizedPanel === 'requests'`: render `RequestList` with full terminal width and `rows - 1` height, `focused={true}`; adjust `contentWidth` computation for full-width rendering
- [x] 4.4 When `maximizedPanel === 'response'`: render `ResponseView` with full terminal width, `rows - 1` height (minus status bar), `focused={true}`; adjust `availableHeight` and `contentWidth` computations for full-width rendering
- [x] 4.5 When `maximizedPanel === 'details'`: render `RequestDetailsView` with full terminal width, appropriate height, `focused={true}`; adjust `maxHeight` and `contentWidth` computations for full-width rendering

## 5. Verification

- [x] 5.1 Run `npm run build` to verify TypeScript compilation succeeds
- [x] 5.2 Run `npm test` to verify all existing tests pass
- [ ] 5.3 Manually test fullscreen toggle: press `f` to enter, `f` to exit, `Escape` to exit
- [ ] 5.4 Manually test fullscreen on all three panels: requests, response, and details
- [ ] 5.5 Manually test keyboard guards: `Tab` no-op in fullscreen, `d` no-op on fullscreen details panel
- [ ] 5.6 Manually test overlay compatibility: help overlay (`?`), file load (`o`), and search (`/`) all work in fullscreen mode