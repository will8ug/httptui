## Why

The file-load overlay (`o` key) requires typing a full file path with no assistance — a single typo means a failed Enter and retyping. Command-line users expect `Tab` completion in any path input; its absence makes the overlay feel foreign compared to the shells they came from.

## What Changes

- Pressing `Tab` in the file-load overlay completes the file name in the current directory segment of the input, following shell conventions:
  - Exactly one match: complete the name in full; directories are completed with a trailing `/` so completion can be chained down a tree.
  - Multiple matches: extend the input to the longest common prefix; when no further progress is possible, display the candidate list in the overlay.
  - No matches: silent no-op.
- Candidate lists render as a single dim row beneath the path input, clipped to the overlay width with an overflow count; any edit or cursor move clears the list.
- Completion respects shell filtering conventions: dotfiles are excluded unless the partial name starts with `.`; no filtering by file extension.
- The overlay hint line mentions `Tab` alongside Enter and Esc.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `file-load`: the path input gains `Tab` completion behavior and a candidate-list display in the overlay.

## Impact

- `src/app.tsx`: new `Tab` branch in the `fileLoad` key-handling section.
- `src/utils/`: new pure path-completion module (filesystem access injected for testability) plus unit tests in `test/utils/`.
- `src/core/reducer.ts` / `src/core/types.ts`: new `fileLoadCompletions` state, cleared by edit and cursor-move actions.
- `src/components/FileLoadOverlay.tsx`: new optional candidate-list row and updated hint line; component test updates.
- No new dependencies; no changes to path resolution on Enter (still resolved against the process working directory).
