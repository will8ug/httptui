## Why

Horizontal scrolling currently has no upper bound. Users can keep pressing `l`/`→` indefinitely even after all visible content has scrolled off-screen, leaving a panel of blank lines. This is disorienting — the user loses their place and must blindly scroll back left. The scroll offset should be clamped so it stops once the longest line has been fully revealed.

## What Changes

- Compute the maximum content width (longest line length) for each panel when handling `SCROLL_HORIZONTAL`
- Clamp the horizontal offset so it cannot exceed `maxLineWidth - 1`, ensuring at least one character of the longest line remains visible
- For the **request panel**: the max width is derived from the longest formatted request line (`prefix + method + target`)
- For the **response panel**: the max width is derived from the longest line across status, headers (if verbose), and body content

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `horizontal-navigation`: The `SCROLL_HORIZONTAL` reducer action SHALL clamp the horizontal offset to an upper bound derived from the maximum content line width, preventing scrolling past all visible content.

## Impact

- `src/app.tsx`: The `SCROLL_HORIZONTAL` case in the reducer needs to compute a max offset from current content and clamp accordingly
- No changes to rendering components (`RequestList.tsx`, `ResponseView.tsx`) — clamping happens at the state level before render
- No changes to types — existing `requestHorizontalOffset` / `responseHorizontalOffset` fields are reused
