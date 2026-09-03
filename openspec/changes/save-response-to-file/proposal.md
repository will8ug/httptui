## Why

Response bodies can currently only leave the TUI via the terminal's own copy-paste. Saving a response to a file — for diffing, piping into another tool, attaching to a bug report, or keeping a fixture — requires selecting text in a scrollable pane, which is error-prone for large bodies. `curl -o` users expect an in-app equivalent.

## What Changes

- Add a `s` (lowercase) shortcut in normal mode that opens a save overlay for the current response body — mirroring the existing `S` save-as-.http flow.
- Pre-fill the overlay's path input with `<request-name>.json` when the stored response body parses as JSON, `<request-name>.txt` otherwise (same JSON detection as response pretty-printing). Path separators in request names are replaced with `-`.
- Save the raw stored body (`state.response.body`) verbatim — no pretty-printing, no headers, no status line — like `curl -o`.
- Refuse to overwrite an existing file: show an inline error in the overlay and keep it open, exactly like the save-as-.http flow.
- Relative paths resolve against the loaded file's directory; absolute paths are used as-is.
- Show a transient success message on write; the current file path is NOT rebound (unlike save-as-.http).
- Pressing `s` with no response on screen shows a transient message instead of the overlay.
- Register the shortcut in the centralized registry (`showInBar: false`, `showInHelp: true`, `request` group) and add it to the README shortcut table.

Non-goals: full HTTP dump mode (status + headers + body), binary body preservation (bodies are stored as decoded strings by design), and uniquified auto-save without a prompt.

## Capabilities

### New Capabilities
- `save-response`: Saving the current response body to a file via an `s`-triggered path-input overlay — default filename derivation, JSON/txt extension rule, raw body fidelity, conflict refusal, error handling, and success feedback.

### Modified Capabilities
- `shortcuts`: Add a registry entry for the `s` key (`Save response to file`, help-only, `request` group), following the established per-shortcut requirement pattern.

## Impact

- `src/core/shortcuts.ts` — one new registry entry.
- `src/core/types.ts` — new `responseSave` mode, its state fields (input/cursor/error), and new actions.
- `src/core/reducers/` — new sub-reducer for the response-save mode (enter, input edits, error, success, cancel).
- `src/app/input-handlers.ts` — `s` binding in `handleNormalInput` plus a new `handleResponseSaveInput`.
- `src/app/App.tsx` — route the new mode; render the overlay.
- `src/components/SaveOverlay.tsx` — generalize the hardcoded `Save as .http` title into a prop and reuse for both overlays.
- README.md — Request group shortcut table row.
- No dependency or public API changes.
