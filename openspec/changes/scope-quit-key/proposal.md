## Why

After confirming a search with Enter, the response panel keeps showing a search bar (`/john [2/3]  (Esc to dismiss)`) and match markers, but `mode` has already returned to `'normal'`. The interface therefore presents persistent modal chrome while the input layer is non-modal, and `q` — the quit key — fires immediately. A user who presses `q` intending "leave this search" quits the whole application instead.

Nothing is lost when this happens (unsaved edits already trigger a confirmation prompt), but the session is: the loaded file, every response received, scroll positions, and the selected environment all go away. The fix removes the divergence by making `q` mean "dismiss the search results" whenever those results are on screen.

## What Changes

- While search results are displayed in normal mode, `q` clears the search state instead of quitting. This is the same condition and the same outcome that Escape already produces.
- When no search results are displayed, `q` behaves exactly as it does today: quit, or show the unsaved-changes confirmation prompt when the unsaved-changes flag is set.
- When search results are displayed and the unsaved-changes flag is set, `q` dismisses the results and shows no prompt — the press is no longer a quit, so there is nothing to confirm.
- The status bar keeps advertising `[q] Quit`, which stays accurate: with nothing to dismiss, `q` quits.
- Escape keeps its current behavior and priority order in every state. Fullscreen and in-flight requests are untouched by `q`.
- Documentation gains the search-dismissal keys it is currently missing.

Not included, deliberately:

- No new `mode` value. The condition is derived from existing state, so it cannot fall out of sync.
- No change to the shortcut registry or the help overlay.
- No status-bar message when results are dismissed.
- No change to the `(Esc to dismiss)` hint. Naming `q` there would contradict `[q] Quit` in the status bar.
- No second quit key. `Ctrl+C` remains the immediate, unconditional exit.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `response-search`: adds a requirement that `q` dismisses displayed search results, alongside the existing Escape dismissal.
- `unsaved-changes`: the requirement that `q` is intercepted for confirmation is currently written unconditionally. It becomes conditional on no search results being displayed, since `q` is then a dismissal rather than a quit.

The `tui` spec's `## Exit` section also describes `q` as an unqualified clean exit, but that section is prose in an interface map rather than a requirement, so it carries no delta. It is corrected in place as a cross-reference, matching how that spec's `## File Reload` and `## File Load` sections already defer to their capability specs.

## Impact

- `src/app/input-handlers.ts` — the `q` branch in `handleNormalInput` gains a leading condition. No other handler changes; `q` continues to be an ordinary query character while the user is typing a search.
- `README.md` — the Search table lists only `/`, `n`, and `N`, so no key for leaving search is documented anywhere. The General table's Escape row omits search dismissal even though that behavior is already implemented and specified. Both are corrected, and the `q` row is qualified.
- Tests — integration coverage for dismissing search results with `q` does not exist yet and is added. The existing test asserting that `q` on a modified file shows the confirmation prompt exercises a state with no search results and continues to pass; a companion case covers the combination of unsaved changes and displayed results.
- No change to the reducer, to any component, to the shortcut registry, or to the state shape.
