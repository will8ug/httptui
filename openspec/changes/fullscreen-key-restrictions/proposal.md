## Why

Fullscreen currently treats a maximized panel as a pure layout change: most normal-mode keys keep firing while their effect is invisible or external. A stray keystroke while inspecting a response can re-send a request whose response panel is hidden, open an overlay, write a file, or suspend the terminal for an external editor (`Ctrl+G`). Fullscreen should be a safe, focused inspection context governed by one principle: a key works only when its effect is visible on the maximized panel.

## What Changes

- Normal-mode key handling becomes a default-deny whitelist while a panel is maximized; every non-whitelisted key is a silent no-op (matching the existing `Tab`/`d` no-op precedent):
  - **Always live**: navigation (`j`/`k`/`g`/`G`/`0`/`$`/`h`/`l` and arrow keys), `f` (exit fullscreen), `Escape` (cancel in-flight request first, else exit fullscreen — existing priority), `?` (help overlay), `Ctrl+C` (exit — the interrupt key always terminates, per the terminal convention already codified in the unsaved-changes spec).
  - **Response panel maximized only**: `v`/`r`/`w` display toggles, `/` (enter search), `n`/`N` (match navigation), `q` (dismiss search results — preserved exactly; `q` never quits from fullscreen).
  - **Disabled in all fullscreen**: `Enter` (send), `s`, `S`, `p`, `y`, `o`, `E`, `e`, `R`, `Ctrl+S`, `Ctrl+G` — including their unsaved-changes confirmation interception (the keys neither perform their action nor open the confirmation prompt while maximized).
- `d` (toggle details) becomes a no-op in **all** fullscreen states; today it silently toggles the hidden details panel while requests/response are maximized.
- `q`-quit is disabled while maximized (dismissal role unchanged; quitting requires exiting fullscreen first — `Escape` or `f` — or `Ctrl+C`).
- The help overlay can still open over fullscreen (`?` preserved); the file-load overlay can no longer be opened from fullscreen (`o` disabled).
- README shortcut tables gain fullscreen qualifiers; the `SHORTCUTS` registry, help overlay, and status bar texts are untouched (per the repo's shortcut-documentation convention: qualify the README, not the registry).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `fullscreen-panel`: add whitelist requirements for key handling in fullscreen (universal keys, response-panel-only keys, disabled action keys, the `q` dismissal/quit split); strengthen the `d` no-op to all fullscreen states; remove the file-load-over-fullscreen scenario; narrow search-in-fullscreen to the response panel.
- `response-search`: gate `/`, `n`, `N` to response-maximized fullscreen; keep `q` dismissal working regardless of which panel is maximized while removing the quit fallback in fullscreen.

The `tui` spec's exit-condition prose (`q` key bullet) already delegates `q` semantics to the **response-search** spec, so no delta is needed there; the qualifier chain resolves through response-search → fullscreen-panel.

## Impact

- `src/app/input-handlers.ts`: new fullscreen input handler (default-deny whitelist) routed from `handleNormalInput` when `maximizedPanel !== null`; the scattered `maximizedPanel` guards inside the normal ladder are removed, subsumed by the gate.
- Tests: `test/integration/request-cancel.test.tsx` ("Escape while loading in fullscreen cancels but stays fullscreen") must be reframed — it currently sends via Enter while fullscreen. New integration coverage is required for every whitelist class (no existing tests pin the other fullscreen scenarios). `test/integration/search-dismiss.test.tsx` ("q with a maximized panel dismisses the results and leaves the panel maximized") stays green as the regression guard for `q` dismissal.
- Docs: README shortcut tables gain fullscreen qualifiers (`Enter`, `q`, display toggles, search keys, action keys). No registry, help-overlay, or status-bar text changes.
