# Context-Aware Status Bar

## Why

The current status bar only shows the file name and selected request index (e.g., `api.http 1/10`). This is useful when the request list is focused, but provides no context when the user tabs to the response or details panels. Users scrolling through large responses or request details have no visual feedback about their position within the content. We should make the status bar context-aware, showing relevant position info for whichever panel currently has focus.

## What Changes

- **StatusBar component**: Extend to accept panel focus state and scroll offsets. Compute context-aware right-side text based on `focusedPanel`.
- **App component**: Compute `detailsTotalLines` and `responseTotalLines` and pass them to `StatusBar`.
- **RequestDetailsView**: Remove the inline scroll position indicator (`↕ X/Y lines`) — it's now handled by the global `StatusBar`.
- **Shared utility**: Extract a `resolveRequestDetails()` helper to avoid duplicating request resolution logic in `App.tsx`.

## Capabilities

### New Capabilities
- `context-aware-status-bar`: The status bar displays context-sensitive information based on the focused panel (requests, details, or response).

### Modified Capabilities
- `request-details`: Remove the inline scroll indicator from `RequestDetailsView`; scroll position is now shown in the status bar.
- `tui`: Update the status bar description to reflect context-aware behavior.

## Impact

- **Files touched**: `StatusBar.tsx`, `App.tsx`, `RequestDetailsView.tsx`, `utils/request.ts` (or new file), `core/types.ts` (if needed for shared types).
- **No breaking changes** to public APIs or state shape.
- **Visual change**: Users will see the file name always, plus a `|` separator and context info on the right side.
