## 1. State & Types

- [ ] 1.1 Add `showRequestDetails: boolean` (default `false`) to `AppState` interface in `src/core/types.ts`
- [ ] 1.2 Add `{ type: 'TOGGLE_REQUEST_DETAILS' }` to the `Action` discriminated union in `src/core/types.ts`

## 2. Shortcut Definition

- [ ] 1.3 Add `d` shortcut entry to `SHORTCUTS` array in `src/core/shortcuts.ts` with `showInBar: false`, `showInHelp: true`, label `Details`, description `Toggle request details panel`

## 3. Reducer & Key Handler

- [ ] 2.1 Add `TOGGLE_REQUEST_DETAILS` case to the reducer in `src/app.tsx` that toggles `showRequestDetails`
- [ ] 2.2 Handle `d` key in `useInput` in `src/app.tsx` to dispatch `TOGGLE_REQUEST_DETAILS`
- [ ] 2.3 Add `showRequestDetails: false` to `createInitialState()` in `src/app.tsx`

## 4. RequestDetailsView Component

- [ ] 3.1 Create `src/components/RequestDetailsView.tsx` that accepts `request: ParsedRequest`, `variables: FileVariable[]`, and `maxHeight: number` props
- [ ] 3.2 Call `resolveVariables(request, variables)` inside the component to get the resolved request
- [ ] 3.3 Render method (colorized), resolved URL, resolved headers (gray, name:value format), and resolved body (if present) with a horizontal separator between sections
- [ ] 3.4 Truncate body content that exceeds the available height, showing an ellipsis indicator when truncated
- [ ] 3.5 Wrap the content in a bordered `Box` consistent with the `ResponseView` styling pattern

## 5. Layout Integration

- [ ] 4.1 Modify `Layout.tsx` to accept an optional `detailPanel` prop (`React.ReactNode`)
- [ ] 4.2 When `detailPanel` is provided, render it above the `right` content inside a vertical flex `Box` in the right column
- [ ] 4.3 Pass `detailPanel` from `App` — conditionally render `<RequestDetailsView>` when `state.showRequestDetails` is true, passing the selected request and variables

## 6. Help Overlay Update

- [ ] 5.1 Verify help overlay reads from `SHORTCUTS` array (it should automatically pick up the new `d` entry — confirm no hardcoded shortcut list exists)

## 7. Verification

- [ ] 6.1 Run `npm run build` and verify no type errors
- [ ] 6.2 Run `npm test` and verify all existing tests pass
- [ ] 6.3 Manually verify: pressing `d` toggles the panel, the details show resolved data, pressing `d` again hides it