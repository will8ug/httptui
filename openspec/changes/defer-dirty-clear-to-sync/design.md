## Context

The `add-request-body-editing` change introduced an unsaved-changes flag (`isDirty`) and a confirm-discard modal guarding `R`, `o`, and `q` when the flag is set (prior Decision 9). The `CONFIRM_DISCARD` reducer action currently clears the flag synchronously at confirmation time. The downstream actions `RELOAD_FILE` and `LOAD_FILE` also clear the flag — independently — when they actually replace in-memory state with disk content (prior Decision 11), and `SAVE_FILE` clears it on successful save.

The redundancy between `CONFIRM_DISCARD` and the downstream actions is harmless on the happy path but harmful on the abandon and failure paths. If the user confirms an open and then cancels the file-load overlay, or confirms a reload that fails to read or parse, the flag is already cleared while the in-memory edits survive. The status bar reports "clean" while uncommitted edits persist in memory.

## Goals / Non-Goals

**Goals:**

- Make `isDirty` an honest invariant: set iff in-memory `state.requests` differs from disk, cleared only when in-memory state is actually synced to disk.
- Stop clearing the flag in `CONFIRM_DISCARD`; rely on the existing clears in `RELOAD_FILE`, `LOAD_FILE`, and `SAVE_FILE`.
- Preserve all other behavior of the confirm-discard modal: entry conditions, presentation, decline, and `Ctrl+C` bypass.

**Non-Goals:**

- Eliminating the `CONFIRM_DISCARD` action entirely. Considered and rejected — see Decision 1.
- Reverting in-memory edits to disk on confirm (true "discard = revert" semantics). The in-memory edits persist through the confirm; the flag tracks them honestly until a sync replaces or persists them.
- Changing when the flag is set, or how it is displayed.
- Lossless in-place save to the source file. Still out of scope per the prior change's non-goals.

## Decisions

### Decision 1: Remove the flag clear from `CONFIRM_DISCARD`; keep the action

`CONFIRM_DISCARD`'s reducer case drops `isDirty: false`. It retains `mode: 'normal'` and `pendingDiscardAction: null` — its load-bearing role as guaranteed modal teardown before the recorded side effect runs.

The downstream actions already clear the flag at the honest moment:

- `RELOAD_FILE` clears it when in-memory state is replaced with freshly-read disk content.
- `LOAD_FILE` clears it when a different file's content replaces in-memory state.
- `SAVE_FILE` clears it when edits are persisted to a file.
- `exit()` for `quit` terminates the process; the flag is irrelevant.

On the abandon and failure paths the flag now correctly remains set:

- Confirm open → cancel file-load overlay → flag stays set (edits still in memory).
- Confirm reload → read or parse fails → flag stays set (edits still in memory).

*Alternative considered — eliminating `CONFIRM_DISCARD` entirely and letting each follow-up action exit the modal.* Rejected. `RELOAD_FILE` does not set `mode`, so the modal would stay open on reload; and the reload can fail (parse error dispatching `REQUEST_ERROR`), which also does not set `mode`, so the modal would get stuck on failure. Eliminating the action cleanly would require `RELOAD_FILE` and `REQUEST_ERROR` to each absorb modal-exit responsibility, spreading a cross-cutting concern and widening the blast radius for a one-fewer-action-type benefit. `CONFIRM_DISCARD`'s centralized "tear down the modal before the dice roll" role is genuinely useful and is retained.

### Decision 2: The confirm prompt text is unchanged

The prompt already states that unsaved changes exist and names the action that confirming will perform. It does not promise "your changes will be discarded" as a guaranteed side effect of pressing `y`; it says confirming will perform the intercepted action. The new behavior — the flag clears when the action syncs to disk, not at confirm — is consistent with that wording, so no presentation change is needed.

## Risks / Trade-offs

- **A user who confirms discard, cancels the file-load overlay, and then makes further edits sees the `*` persist throughout.** → Correct. The flag tracks in-memory-versus-disk, and the in-memory edits never went anywhere. This matches the expectation stated in the bug report.
- **A user who confirms a reload that fails keeps the `*` marker.** → Correct. The in-memory edits survive the failed reload, so the flag must stay set. The prior behavior of clearing on confirm is the same class of lie this change fixes.
- **The unit test asserting `CONFIRM_DISCARD` clears the flag must flip.** → Required test update, not a regression. The new assertion captures the intended invariant that the flag is preserved through confirmation until a sync completes.

No migration plan is needed: this is a reducer-internal behavior change with no persisted-data or API impact.
