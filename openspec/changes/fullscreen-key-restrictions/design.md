## Context

`handleNormalInput` (`src/app/input-handlers.ts`, ~lines 590-884) is a linear key ladder serving normal mode. Fullscreen state (`state.maximizedPanel`) is currently handled by three scattered guards inside it: Escape-exits-fullscreen (line 617), `Tab` gated on `maximizedPanel === null` (line 651), and `d` gated on `maximizedPanel !== 'details'` (line 671). Every other key — including `Enter` (send, line 826), `o`/`E`/`S`/`s`/`e` (overlay openers), `y`/`p` (clipboard), `R` (reload), `Ctrl+S` (in-place save), `Ctrl+G` (editor handoff, suspends the terminal), and `q`-quit (line 632) — fires with no fullscreen awareness.

Modes (`state.mode`) are dispatched in `App.tsx`'s single `useInput` before `handleNormalInput` is reached, so search mode, file load, edit, and confirm dialogs already take precedence over everything here. `Ctrl+C` is explicitly handled inside `handleNormalInput` (line 627: `exit()`).

## Goals / Non-Goals

**Goals:**

- A default-deny key whitelist while a panel is maximized, so future keys added to `handleNormalInput` cannot accidentally leak into fullscreen.
- Preserve exactly the key classes specified in the delta specs: universal keys, response-panel-only keys, and `q`'s dismissal-without-quit split.
- Zero behavior change outside fullscreen.

**Non-Goals:**

- Promoting fullscreen to an `AppMode`. Modes intercept keys wholesale; fullscreen must stay a sub-state of normal mode so search mode (entered from a maximized response panel) continues to overlay it, per the fullscreen-panel spec.
- Touching the `SHORTCUTS` registry, help overlay, or status bar texts (README-only qualifiers, per the repo's shortcut-documentation convention).
- Changing Escape priority, navigation behavior, or the search-mode lifecycle.

## Decisions

### Decision 1: A dedicated `handleFullscreenInput` handler with a default-deny structure

Add `handleFullscreenInput` to `src/app/input-handlers.ts` and route to it from the top of `handleNormalInput`:

```text
handleNormalInput(...):
  if state.maximizedPanel !== null:
    handleFullscreenInput(... same args ...)
    return
  ... existing ladder unchanged ...
```

The alternative — scattering `&& state.maximizedPanel === null` guards across ~13 branches — was rejected: it is leak-prone (the `Enter` gap being fixed is exactly such a leak) and every future key must remember its guard. A whitelist makes exclusion the default.

`handleFullscreenInput` structure (authoritative pseudocode):

```text
handleFullscreenInput(input, key, state, ...deps):
  # Exits and safety — always live
  if key.escape and state.isLoading:
    abortControllerRef.current?.abort()
    dispatch REQUEST_CANCEL with warning 'Request canceled'
    return
  if key.escape and state.maximizedPanel === 'response'
     and (state.searchMatches.length > 0 or state.lastSearchQuery):
    dispatch CANCEL_SEARCH               # dismiss search, stay fullscreen
    return
  if key.escape:
    dispatch TOGGLE_FULLSCREEN          # exit fullscreen
    return
  if key.ctrl and input === 'c':
    exit()                              # interrupt key always terminates
    return
  if input === 'f':
    dispatch TOGGLE_FULLSCREEN
    return
  if input === '?':
    dispatch TOGGLE_HELP
    return

  # Navigation — same dispatches as the normal-mode tail (lines 831-884)
  if input === 'g':  dispatch JUMP_VERTICAL start;    return
  if input === 'G':  dispatch JUMP_VERTICAL end;      return
  if input === '0':  dispatch JUMP_HORIZONTAL start;  return
  if input === '$':  dispatch JUMP_HORIZONTAL end;    return
  isLeft  = input === 'h' or key.leftArrow
  isRight = input === 'l' or key.rightArrow
  if isLeft or isRight: dispatch SCROLL_HORIZONTAL;   return
  isUp   = input === 'k' or key.upArrow
  isDown = input === 'j' or key.downArrow
  if not (isUp or isDown): fall through to response-only block, then stop
  if state.maximizedPanel === 'requests':
    dispatch MOVE_SELECTION up/down
  else:                                  # details or response
    dispatch SCROLL up/down
  return

  # Response-panel-only keys
  if state.maximizedPanel === 'response':
    if input === 'v': dispatch TOGGLE_VERBOSE; return
    if input === 'w': dispatch TOGGLE_WRAP;    return
    if input === 'r': dispatch TOGGLE_RAW;     return
    if input === '/': dispatch ENTER_SEARCH;   return
    if input === 'n' and state.searchMatches.length > 0:
      dispatch NEXT_MATCH  (same computation as normal mode)
      return
    if input === 'N' and state.searchMatches.length > 0:
      dispatch PREV_MATCH  (same computation as normal mode)
      return

  # Search dismissal — any maximized panel (per the response-search spec invariant)
  if input === 'q' and (state.searchMatches.length > 0 or state.lastSearchQuery):
    dispatch CANCEL_SEARCH                     # never exit(), never REQUEST_DISCARD_CONFIRM in fullscreen

  # Everything else: silent no-op
```

Notes:
- Escape ordering follows the navigation spec's priority chain: cancel in-flight first (stays fullscreen), then — only while the response panel is maximized — clear active search state (stays fullscreen; the search bar is visible there), then exit fullscreen. Non-response fullscreen skips the dismissal rung deliberately: the search bar is invisible there, so the first Escape must have a visible effect (exiting fullscreen); stale search state remains and clears after exit.
- `q` dismissal keeps the exact normal-mode condition (`searchMatches.length > 0 || lastSearchQuery`) and works regardless of which panel is maximized, per the response-search spec. The quit fallback (`hasUnsavedChanges` → `REQUEST_DISCARD_CONFIRM`, else `exit()`) is simply not reachable in fullscreen.
- `n`/`N` reuse the same `computeVerticalMaxOffset` / `getBodyVisualStart` computations as the normal ladder; factor or duplicate minimally per surrounding style, but the dispatched values must be identical.
- Navigation dispatches route on `maximizedPanel` (not `focusedPanel`). The two are equal whenever a panel is maximized — `Tab` is gated and nothing else changes focus while maximized — but routing on the rendered panel is the direct expression of intent.

### Decision 2: Remove the now-dead fullscreen guards from `handleNormalInput`

After the gate in Decision 1, `handleNormalInput` only runs with `maximizedPanel === null`. The three existing guards become dead conditions and are removed: the Escape-exits-fullscreen branch (lines 617-620, relocated into `handleFullscreenInput`), the `state.maximizedPanel === null` conjunct on `Tab` (line 651), and the `state.maximizedPanel !== 'details'` conjunct on `d` (line 671). Leaving them would split fullscreen logic across two places — the situation this change eliminates.

### Decision 3: `Ctrl+C` stays live in fullscreen, unconditionally

`Ctrl+C` is handled explicitly in `handleFullscreenInput` before anything else can swallow it. The unsaved-changes spec already codifies the principle ("preserving the terminal convention that the interrupt key always terminates"); fullscreen must not become a state a user can get stuck in if any other exit path misbehaves.

### Decision 4: Silent no-ops, no transient messages

Disabled keys do nothing and say nothing, matching the established `Tab`/`d` no-op precedent. With `?` kept live, a confused user can still discover the rules; transient messages per rejected key would be noise.

### Decision 5: Help and search still stack over fullscreen

No changes to mode dispatch in `App.tsx`. `?` opens the help overlay (its handler takes precedence and closing it returns to fullscreen). `/` from a maximized response panel enters search mode, which handles its own keys; on confirm/cancel the app returns to normal mode with `maximizedPanel` intact, and `handleFullscreenInput` resumes.

## Risks / Trade-offs

- [Muscle-memory friction: `Enter` no longer sends from a maximized request list] → Mitigation: `Escape`/`f` then `Enter` is a two-keystroke path, and sending from fullscreen never showed the response anyway (the feedback loop was already broken). README documents the qualifier.
- [Users who learned the old Escape order in maximized response (exit fullscreen, then clear results) now get the reverse] → Mitigation: both orders take two presses to achieve both effects; the on-screen search bar hint `(Esc to dismiss)` now matches the first press's actual behavior, making the new order self-explanatory.
- [Users press disabled keys and the app feels dead] → Mitigation: `?` remains live specifically as the discovery path; no-ops are consistent with existing fullscreen no-ops.
- [`q`-dismissal in a non-response fullscreen is an invisible state change] → Accepted deliberately: the response-search spec's invariant ("dismissal regardless of maximized panel") predates this change, the reachable states are contrived (moving the selection clears search state first), and splitting `q`'s dismissal by panel would complicate the rule for negligible benefit.
- [Duplicate `n`/`N` computation between handlers drifts] → Mitigation: extract the match-target computation into a small shared helper next to the existing search helpers rather than copying the arithmetic.
- [Existing test `request-cancel.test.tsx` "Escape while loading in fullscreen cancels but stays fullscreen" breaks] → Mitigation: reframe to send while in normal mode, then maximize, then Escape — the scenario's subject (cancel-in-fullscreen priority) is unchanged.

## Migration Plan

Single PR, no data or state migration: the reducer, actions, and `AppState` are untouched; only input routing changes. Rollback is reverting the routing commit. README qualifier rows ship in the same change.
