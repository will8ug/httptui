## Why

Currently, both the RequestList and ResponseView panels only support vertical scrolling (↑/↓/j/k). Long request paths, URLs, or response lines that exceed panel width are truncated with `…` and become unreadable. There is no way for users to horizontally scroll within either panel to reveal hidden content. Adding Left/Right navigation shortcuts would give users full control over horizontal viewport position, making truncated content accessible.

## What Changes

- Add `←`/`h` and `→`/`l` key bindings for horizontal navigation in both panels
- Add two new `Action` types: `SCROLL_LEFT` and `SCROLL_RIGHT` (or extend `SCROLL` to support `left`/`right` directions)
- Add `requestHorizontalOffset` and `responseHorizontalOffset` state fields to `AppState`
- Update `RequestList` component to render content shifted by `requestHorizontalOffset`
- Update `ResponseView` component to render content shifted by `responseHorizontalOffset`
- Register the new shortcuts in the centralized `SHORTCUTS` array in `src/core/shortcuts.ts`
- Display `[←/→] Scroll` in the status bar (with `showInBar: true`)
- Show Left/Right keys in the Help overlay

## Capabilities

### New Capabilities
- `horizontal-navigation`: Left/Right key bindings and horizontal scroll offset state for both RequestList and ResponseView panels, including action dispatch, state tracking, and rendering logic

### Modified Capabilities
- `shortcuts`: Add `←/→` (or `←/h`/`→/l`) entries to the centralized shortcut registry
- `tui`: Add horizontal offset tracking to AppState, extend key handler for Left/Right, update RequestList and ResponseView rendering to respect horizontal offsets

## Impact

- `src/core/types.ts` — Add `requestHorizontalOffset` and `responseHorizontalOffset` to `AppState`; extend `Action` union with horizontal scroll actions
- `src/core/shortcuts.ts` — Add Left/Right shortcut entries
- `src/app.tsx` — Add Left/Right key handling in `useInput` and reducer logic for horizontal offsets
- `src/components/RequestList.tsx` — Apply horizontal offset to rendered content
- `src/components/ResponseView.tsx` — Apply horizontal offset to rendered content
- `src/components/StatusBar.tsx` — Automatically shows new shortcuts (already data-driven)
- `src/components/HelpOverlay.tsx` — Automatically shows new shortcuts (already data-driven)