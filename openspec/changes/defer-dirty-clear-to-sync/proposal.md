## Why

The unsaved-changes flag is cleared at the wrong moment. When the user confirms a discard to proceed with opening another file, the flag is cleared immediately — before the new file actually loads. If the user then cancels the file-load overlay, the flag is already gone while the in-memory edits are still present. The status bar reports "clean" while uncommitted edits persist in memory: a lie. The same class of lie occurs when a confirmed reload fails to read or parse the file.

## What Changes

- The unsaved-changes flag SHALL no longer be cleared at confirmation time. `CONFIRM_DISCARD` will stop clearing it.
- The flag SHALL be cleared only when in-memory state is actually synced to disk — which the existing `LOAD_FILE`, `RELOAD_FILE`, and `SAVE_FILE` actions already do. No change to those actions is required.
- Cancelling the file-load overlay after confirming discard SHALL leave the flag set, matching the in-memory edits that were never replaced or persisted.
- A failed reload after confirmation SHALL leave the flag set, matching the in-memory edits that survive the failed sync.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `unsaved-changes`: The "Confirmation prompt resolution" requirement no longer mandates clearing the flag on proceed. The flag clears at the actual sync point (load/reload/save), already specified by the existing "Loading or reloading a file clears the unsaved-changes flag" and "Successful save clears the unsaved-changes flag" requirements. A new scenario covers the cancel-after-confirm path.

## Impact

- `src/core/reducer.ts` — the `CONFIRM_DISCARD` case drops its `isDirty: false` mutation. `RELOAD_FILE`, `LOAD_FILE`, and `SAVE_FILE` already clear the flag and are unchanged.
- `test/core/unsaved-changes.test.ts` — the unit assertion that `CONFIRM_DISCARD` clears the flag flips to assert the flag is preserved.
- Integration coverage — a new test for the confirm-discard → cancel-file-load flow asserting the flag (and status-bar marker) persists.
- No public API, dependency, or persisted-data impact.
