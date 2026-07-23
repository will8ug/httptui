## Why

Body content containing literal tab characters (`\t`) renders incorrectly in the request details panel. The rendering pipeline measures line width using `string.length` (which counts a tab as 1 character), but the terminal expands tabs to 8-column tab stops. This mismatch causes text to overflow past the panel's right border, producing visual artifacts — stray border `│` characters on otherwise-blank lines — between tab-indented content lines. The bug is latent in split-panel mode (tabs get truncated away) but manifests prominently when the panel is maximized (`f`), because the wider content area allows full-length tab-containing lines to pass through `truncateText` unclipped.

## What Changes

- Expand tab characters to spaces before rendering body lines in `RequestDetailsView`. This ensures `truncateText` and `shiftText` width calculations match the terminal's visual width, preventing overflow.
- Apply the same tab expansion in the `ResponseView` body rendering path (`wrapLine` / `truncateText` consumers) so raw-mode responses with tabs are also handled correctly.
- Add a `expandTabs` utility function that converts `\t` to spaces using standard 8-column tab-stop logic (pad to the next multiple of 8).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `request-details`: Add a requirement that tab characters in body content SHALL be expanded to spaces before rendering, so that line width matches terminal visual width and content does not overflow panel bounds.

## Impact

- **Code**: `src/utils/text.ts` (new `expandTabs` function), `src/components/RequestDetailsView.tsx` (apply expansion to body lines before `shiftText`), `src/components/ResponseView.tsx` or `src/core/response-layout.ts` (apply expansion in the response body path), `src/utils/wrap.ts` (potentially apply expansion in `wrapLine`).
- **No API changes**: No new public interfaces, no breaking changes.
- **No new dependencies**: Pure TypeScript string manipulation.
- **Tests**: New test cases for tab expansion in body rendering.
