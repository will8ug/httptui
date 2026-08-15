## Why

The in-TUI editor (`e`) can only change a selected request's URL, headers, and body. File-level content — file variables (`@baseUrl = ...`), comments, request names, and the set of requests itself — is unreachable from the TUI, so adding, deleting, reordering, or renaming a request forces the user to quit httptui, edit elsewhere, and relaunch. Handing the source file to the user's `$EDITOR` and reloading on return closes that gap with one keystroke.

## What Changes

- Add a `Ctrl+G` command in normal mode that opens the current source file in the user's external editor and reloads it when the editor exits.
- Refuse the command for Postman and OpenAPI sources, which cannot round-trip through the `.http` parser.
- Route the command through the existing unsaved-changes confirmation prompt, since the on-disk file does not contain uncommitted in-memory edits.
- Detect whether the file actually changed and skip the reload when it did not, so an editor opened and quit without saving is a silent no-op.
- Preserve the current in-memory requests when the edited file fails to parse, and when it parses to zero requests.
- No breaking changes. The in-TUI editor, `R`, `o`, `S`, and `Ctrl+S` all keep their current behavior.

## Capabilities

### New Capabilities

- `editor-handoff`: Suspending the TUI to hand the terminal to an external editor and resuming afterwards — the `Ctrl+G` trigger, source-format gating, editor resolution and launch, change detection on return, and the reload outcomes (success, unparseable file, zero requests).

### Modified Capabilities

- `shortcuts`: Add a registry requirement for the `Ctrl+G` entry, following the established per-shortcut pattern.
- `unsaved-changes`: The interception requirement currently names exactly three keys (`R`, `o`, `q`); `Ctrl+G` becomes a fourth intercepted action, and the confirmation prompt must be able to describe it.

Behavior that already has a home is cross-referenced rather than restated: reload semantics and parse-failure state preservation live in **file-reload**, the http-format gating precedent lives in **in-place-save**, transient messages live in **status-bar**, and the split-panel/alternate-screen layout lives in **tui**.

## Impact

- **Source**: `src/app.tsx` (new normal-mode branch, new pending-action arm), `src/core/types.ts` (fourth `PendingDiscardAction` variant), `src/components/ConfirmDiscardOverlay.tsx` (fourth prompt case), `src/core/shortcuts.ts` (new entry), `src/cli.tsx` (alternate-screen management). No reducer changes are required — the discard-confirm reducer cases are already generic over the action type.
- **Dependencies**: No new packages. Uses Node's built-in `child_process` — the first such use in `src/` — and Ink's `suspendTerminal()`, available in the pinned Ink version.
- **Terminal lifecycle**: `cli.tsx` currently enters and leaves the alternate screen by writing escape sequences directly. Ink can only hand the alternate screen to a child process if it owns that state, so this moves to Ink's render option. Observable behavior is unchanged, so no **tui** spec delta is needed.
- **Docs**: README keyboard-shortcut table gains the new binding.
- **Out of scope**: handing an individual edit buffer (rather than the whole file) to `$EDITOR`; and a pre-existing selection-index bug that a zero-request state can trigger via `R`, which this change avoids by refusing to enter that state and which is left to a follow-up change.
