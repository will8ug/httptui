## Why

httptui loads the .http file once at startup and never re-reads it. Since the TUI has no editing capability, users must edit the file in an external editor and restart httptui to see changes. This breaks workflow for API development, where request definitions change frequently.

## What Changes

- Add a keyboard shortcut (`R`) that re-reads the current .http file from disk and replaces the in-memory requests and variables.
- Preserve selection position when possible (e.g., if the same request name still exists after reload, keep it selected; otherwise reset to first).
- Clear stale response data on reload so the user isn't seeing a response from a previous version of a request.
- Show a brief confirmation in the status bar that the file was reloaded.
- Document the `R` shortcut in the help overlay and README.

## Capabilities

### New Capabilities

_(none — this extends existing capabilities)_

### Modified Capabilities

- `tui`: Add file-reload action triggered by `R` key. Re-parses the current file, replaces requests and variables in state, resets selection and clears response. Status bar shows reload confirmation.

## Impact

- **Code**: `src/core/types.ts` (new action type), `src/app.tsx` (reducer case, input handler, file re-read logic), `src/components/StatusBar.tsx` (reload confirmation display), `src/components/HelpOverlay.tsx` (new shortcut entry).
- **Tests**: New tests for the reducer case and argument parsing are not strictly needed (pure state transitions), but a smoke test for the reload path is valuable.
- **Docs**: `README.md` — add `R` to keyboard shortcuts table.