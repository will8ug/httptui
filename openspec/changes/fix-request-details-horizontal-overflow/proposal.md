## Why

The Request Details panel in httptui suffers from a visual overflow bug when horizontally scrolling long content (URLs, XML bodies). Pressing `l` to scroll right causes content to spill left outside the panel bounds, overlapping the Requests sidebar. This breaks the UI layout and makes the application look broken.

## What Changes

- Fix `RequestDetailsView.tsx` to use content-slicing approach (like `RequestList` and `ResponseView`) instead of negative margin for horizontal scrolling
- Truncate long lines to fit within the panel's available content width
- Remove the `marginLeft={-horizontalOffset}` hack that causes the overflow

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `request-details`: Fix horizontal overflow behavior. When `horizontalOffset > 0`, content must be sliced and truncated to fit within panel bounds instead of using negative margin which bleeds into adjacent panels.

## Impact

- `src/components/RequestDetailsView.tsx`: Primary fix location
- `src/utils/layout.ts`: May need a new helper for detail panel content width
- No breaking changes to user-facing behavior (horizontal scroll still works, just correctly)
