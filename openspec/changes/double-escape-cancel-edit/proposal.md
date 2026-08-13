## Why

A single accidental `Esc` press in the request editor currently closes the overlay and silently discards every in-progress buffer with no confirmation. Since the editor is the only place that loses work with a single keystroke, this change adds a lightweight guard: when there are uncommitted edits, the first `Esc` shows a transient hint, and a second `Esc` within a short window is required to actually discard and close.

## What Changes

- When the editor has uncommitted changes (any buffer differs from the request's stored values), the first `Esc` no longer closes the editor. It shows the transient message `Press Esc again to discard changes` and arms a short window.
- A second `Esc` within the window (2 seconds) discards all buffers and closes the editor, exactly as a single `Esc` does today.
- If the second `Esc` arrives after the window expires, it re-arms (re-shows the hint) instead of discarding; the editor stays open.
- When the editor has no uncommitted changes, `Esc` closes immediately with no hint, preserving today's behavior.
- Committing with `Ctrl+S` and cancelling both reset the armed state; the hint auto-clears via the existing transient-message mechanism.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `request-editing`: The "Cancel the edit with Escape" requirement changes — cancel now requires a confirming second `Esc` within a short window whenever the editor has uncommitted changes, and shows a transient hint after the first `Esc`.

## Impact

- `src/core/types.ts` — new `editEscapeArmedAt` state field and new action(s).
- `src/core/reducer.ts` — arm/cancel/commit handling for the new state.
- `src/app.tsx` — edit-mode `Escape` handler gains the dirty check and window logic.
- `src/utils/timing.ts` — new window constant (or reuse of the transient-clear duration).
- `test/integration/request-body-editing.test.tsx`, `test/integration/request-headers-editing.test.tsx` — existing single-`Esc`-after-edit scenarios must now press `Esc` twice.
- `openspec/specs/request-editing/spec.md` — the cancel requirement and its scenarios are updated by the delta spec.
