## Why

When working with `.http` files containing variables like `{{baseUrl}}` or `{{$dotenv API_KEY}}`, there's no way to see the resolved request that will actually be sent. Users must send the request and infer details from the response, or mentally trace variable substitutions. A quick-toggle panel showing the current request's method, resolved URL, headers, and body would let users verify their request before sending — reducing wasted round trips and debugging time.

## What Changes

- Add a **Request Details panel** above the response view, toggled by pressing `d`. Pressing `d` again hides it.
- The panel displays the currently selected request's: HTTP method, resolved URL (with variables substituted), resolved headers, and resolved body.
- Add `showRequestDetails: boolean` to `AppState` and a `TOGGLE_REQUEST_DETAILS` action to the reducer.
- Add a `d` shortcut entry to `shortcuts.ts` (shown in help overlay, hidden from status bar like `w` and `o`).
- Create a `RequestDetailsView` component that renders the request details inside the right panel area.
- Modify `Layout.tsx` to conditionally render the `RequestDetailsView` above `ResponseView` within the right panel column.
- Modify `app.tsx` to wire up the `d` key handler and pass request data + variables to the new component.

## Capabilities

### New Capabilities

- `request-details-panel`: A toggleable panel above the response view that displays the currently selected request's method, resolved URL, headers, and body. Toggled via the `d` key.

### Modified Capabilities

(None — no existing specs are modified.)

## Impact

- **New files**: `src/components/RequestDetailsView.tsx`
- **Modified files**: `src/core/types.ts` (AppState, Action), `src/core/shortcuts.ts` (new `d` shortcut), `src/components/Layout.tsx` (right panel splits into details + response), `src/app.tsx` (key handler, state, props)
- **Dependencies**: Uses existing `resolveVariables()` from `src/core/variables.ts` and `getLeftPanelWidth`/`getResponseContentWidth` layout helpers.
- **No breaking changes**: The feature is opt-in via toggle; default state is hidden.