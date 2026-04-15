## Why

Right-scrolling in both the RequestList and ResponseView panels continues past the point where the last character of the longest line is already visible within the panel. The current upper bound is `maxLineWidth - 1`, which means users can scroll until only one character of the longest line remains — even though the panel could show much more. This wastes scrolling effort and makes content harder to track. Scrolling right should stop as soon as the end of the longest line is reachable within the current panel width.

## What Changes

- Change the upper bound for horizontal scroll offset from `maxLineWidth - 1` to `max(0, maxLineWidth - contentWidth)` for both panels
- Pass terminal width information (columns) into the reducer so it can compute `contentWidth` for each panel
- Reset the horizontal offset to `0` or clamp it to the new max when the terminal is resized or content changes, so the offset never exceeds the new boundary

## Capabilities

### New Capabilities

_(None — this change modifies an existing capability.)_

### Modified Capabilities

- `horizontal-navigation`: Change the right-scroll boundary calculation so that scrolling stops when the last character of the longest line fits within the visible panel width, rather than allowing scroll until only one character remains

## Impact

- **`src/app.tsx`**: Reducer `SCROLL_HORIZONTAL` case — `maxOffset` calculation now uses `maxLineWidth - contentWidth` instead of `maxLineWidth - 1`; reducer needs access to terminal columns
- **`src/core/types.ts`**: Potentially a new action payload field or state field to carry terminal width into the reducer
- **Tests**: Existing horizontal scroll tests need updated assertions for the new boundary calculation