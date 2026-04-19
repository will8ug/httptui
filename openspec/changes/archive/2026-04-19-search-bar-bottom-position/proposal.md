## Why

The search bar in the response panel currently flows immediately after the response content rather than being pinned to the bottom of the panel. When the visible content doesn't fill the entire panel height, the search bar floats in the middle of the panel instead of appearing at a fixed position at the bottom. This is inconsistent with common TUI conventions (like vim's command line) where the search/command input is always anchored to the bottom edge of the pane.

## What Changes

- Modify the `ResponseView` component's layout so the search bar is always rendered at the very bottom of the response panel, regardless of content height.
- The response body content should fill the remaining vertical space above the search bar using Ink's flex layout (`flexGrow`).
- Add a dimmed Escape hint to the search bar: `(Esc to cancel)` during active search input, `(Esc to dismiss)` when showing search results. Consistent with existing hint style used in `FileLoadOverlay` and `HelpOverlay`.

## Capabilities

### New Capabilities

_None — this is a layout adjustment within an existing capability._

### Modified Capabilities

- `response-search`: The search bar display requirement changes from flowing after content to being pinned to the bottom edge of the response panel.

## Impact

- **Code**: `src/components/ResponseView.tsx` — restructure the JSX layout to use flex spacer or `justifyContent` to pin the search bar to the bottom.
- **Scroll math**: `visibleHeight` calculation in `ResponseView` may need adjustment if the layout structure changes how available space is distributed.
- **No API changes, no dependency changes, no breaking changes.**
