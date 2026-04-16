## Why

When the request-details-panel feature was added, the right column in `Layout.tsx` was wrapped in a `flexDirection="column"` Box to accommodate the new detail panel above the response view. The inner Box wrapping the response view was given `flexGrow={1}` but **no explicit `height`**, breaking Yoga's percentage height resolution chain. This causes the "Response" title and bordered box content to disappear or clip when rendering large response bodies (e.g., `GET /users`), while small responses render correctly.

## What Changes

- Add `height="100%"` to the inner `<Box flexGrow={1}>` in `Layout.tsx` that wraps the `{right}` content (the `ResponseView`). This restores the explicit height chain that existed before the layout change, allowing Yoga to correctly resolve `ResponseView`'s own `height="100%"`.

## Capabilities

### New Capabilities

(None — this is a bug fix, not a new capability.)

### Modified Capabilities

- `tui`: The TUI layout must correctly render the response view title and content regardless of response body size.

## Impact

- **`src/components/Layout.tsx`** — One-line addition: `height="100%"` on the inner `<Box>` at line 34.
- No API changes, no new dependencies, no breaking changes.
- Fixes the regression introduced in the request-details-panel change where large response bodies cause the response title to disappear.