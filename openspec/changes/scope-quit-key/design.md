## Context

See proposal.md — Why.

Two facts about the current implementation shape every decision below.

**`mode` is already `'normal'` while search results are displayed.** `CONFIRM_SEARCH` sets `mode: 'normal'` and deliberately preserves `searchMatches`, `currentMatchIndex`, and `lastSearchQuery` so the highlighting survives. Every keypress after Enter therefore reaches `handleNormalInput`, where `q` is handled. "Search results are displayed" is not a mode; it is the derived condition `searchMatches.length > 0 || lastSearchQuery`.

**Escape already implements this exact condition.** `handleNormalInput` runs an Escape ladder — in-flight request, then fullscreen, then search results — and its third rung uses precisely the predicate above. The change adds one rung to `q` using the same predicate; it introduces no new concept.

## Goals / Non-Goals

**Goals:**

- `q` clears displayed search results on the first press, in every state where those results are visible.
- The condition governing `q` is derived from existing state, never stored, so it cannot desynchronize from the search state it describes.
- `[q] Quit` in the status bar remains truthful: with nothing displayed to dismiss, `q` quits.
- Escape's behavior and rung order are byte-for-byte unchanged.

**Non-Goals:**

- Making `q` a general-purpose "go back" key. It gains exactly one rung.
- Reconciling `q` and Escape in the combined fullscreen-plus-results state. They diverge there, deliberately (Decision 2).
- Teaching the user the new behavior through any on-screen affordance (Decision 5).

## Decisions

### Decision 1: Derive the condition; do not add a `mode` value

A stored mode such as `'searchResults'` would have to be cleared everywhere search state is cleared. `CLEAR_SEARCH_STATE` is spread at nine sites, and only the two inside `src/core/reducers/search.ts` also set `mode`:

| Site | Action | Sets `mode`? |
| --- | --- | --- |
| `reducers/search.ts:34` | `CONFIRM_SEARCH` with empty query | yes |
| `reducers/search.ts:67` | `CANCEL_SEARCH` | yes |
| `reducers/navigation.ts:15` | `SELECT_REQUEST` | no |
| `reducers/navigation.ts:22` | `MOVE_SELECTION` | no |
| `reducers/navigation.ts:35` | `APPEND_REQUEST` | no |
| `reducers/lifecycle.ts:17` | `SEND_REQUEST` | no |
| `reducers/lifecycle.ts:27` | `RECEIVE_RESPONSE` | no |
| `reducers/lifecycle.ts:37` | `REQUEST_ERROR` | no |
| `reducers/toggles.ts:38` | `TOGGLE_RAW` | no |

Seven of nine would leave a stored mode set after wiping the results. Scrolling the request list with `j` clears the matches, hides the search bar, and would leave the app in a mode with no visible cause and no way out — `q` would silently stop quitting until some later action happened to reset it. That failure is invisible and permanent, which is strictly worse than the bug being fixed. A derived predicate has no such state to maintain.

*Alternative considered:* add `mode: 'searchResults'` and reset it at all nine sites. Rejected — it makes every future use of `CLEAR_SEARCH_STATE` a correctness hazard for an unrelated concern.

### Decision 2: One rung — search results only

`q` does not exit fullscreen and does not abort an in-flight request.

The search bar is the only chrome that misrepresents the input state: it prints `(Esc to dismiss)` while `mode` is `'normal'`. Fullscreen is honest — it is visually unmistakable and `f` toggles it — so nobody presses `q` in fullscreen meaning "un-maximize". Aborting a request is a side effect, not a dismissal.

Copying Escape's rung order would have defeated the change's own purpose. Escape gives fullscreen priority over search results, and the **fullscreen-panel** spec requires that ordering explicitly. Had `q` matched it, the first `q` in the combined state would exit fullscreen and leave the search bar on screen — reproducing the reported bug on the very press meant to fix it.

*Alternative considered:* full parity with Escape's three rungs. Rejected for the reason above, and because it raises the cost of a deliberate quit to three presses.

### Decision 3: `q` clears results regardless of fullscreen, and diverges from Escape there

In the combined state, the first Escape exits fullscreen while the first `q` clears the results. This divergence is intentional and is the direct consequence of Decision 2. `q` is a narrow interception for misleading chrome, not an alias for Escape, and no on-screen text presents it as one.

Escape is not modified. Changing its documented priority would be a behavioral regression in a capability outside this change's scope.

### Decision 4: The dismiss check precedes the unsaved-changes check

When results are displayed, `q` is not a quit, so the unsaved-changes prompt must not appear. Placing the dismiss check first achieves that and leaves the flag set for the following press.

This narrows the letter of the **unsaved-changes** requirement, which currently intercepts `q` unconditionally, so that spec carries a delta. Ordering the checks the other way would turn "dismiss these search results" into "quit the application?" on a modified file — worse than the original bug.

### Decision 5: No new affordance and no new key

The `(Esc to dismiss)` hint stays as-is; naming `q` there would contradict `[q] Quit` two lines below it in the status bar. The `SHORTCUTS` registry and the help overlay are untouched, so `q` keeps its `Quit` label and the status bar keeps its six entries. No transient message is emitted on dismissal.

No second quit key is added. `Ctrl+Q` was considered and rejected: VS Code binds it to `workbench.action.quit` and dispatches workbench keybindings ahead of the integrated terminal, so it would close the user's editor — and the integrated terminal is a primary venue for this tool. `Q` was also considered and rejected: with the help overlay frozen it would be undiscoverable.

### Decision 6: The predicate must be identical to Escape's

The new condition is `state.searchMatches.length > 0 || state.lastSearchQuery` — character-for-character the predicate on Escape's third rung. Any divergence would produce states where one key dismisses and the other does not. In particular this covers the no-match bar, where `lastSearchQuery` is set and `searchMatches` is empty.

### Implementation

The only change is inside `handleNormalInput` in `src/app/input-handlers.ts`, replacing the existing `q` branch. The Escape ladder above it and the `Ctrl+C` branch immediately above it are unchanged.

```ts
if (input === 'q') {
  if (state.searchMatches.length > 0 || state.lastSearchQuery) {
    dispatch({ type: 'CANCEL_SEARCH' });
    return;
  }

  if (hasUnsavedChanges(state.requests)) {
    dispatch({ type: 'REQUEST_DISCARD_CONFIRM', action: 'quit' });
  } else {
    exit();
  }
  return;
}
```

Constraints on the implementation, stated so they are not inferred loosely from the snippet:

- Do not add a rung for `state.maximizedPanel !== null` or for `state.isLoading`.
- Do not handle `input === 'Q'`.
- Do not touch `handleSearchInput`. While `mode === 'search'` the user is typing, and `q` must remain a query character.
- Do not reorder, duplicate, or reword the Escape ladder at lines 611-625.
- Do not edit `src/core/shortcuts.ts`, `src/components/HelpOverlay.tsx`, or the search-bar hint in `src/components/ResponseView.tsx`.

## Risks / Trade-offs

**A deliberate quit can now need two presses, with nothing explaining why** → Capped at two: one dismissal, then the quit. The status bar still reads `[q] Quit`, and `Ctrl+C` remains an immediate unconditional exit. A transient hint would have taught the contract on first use but was excluded by request; if the silence proves confusing in practice, adding one is a self-contained follow-up that changes no behavior.

**`q` and Escape behave differently in fullscreen with results displayed** → Accepted per Decision 3. Neither key is advertised as the other's alias, and each is individually predictable: `q` always clears results when they are displayed; Escape always exits fullscreen when a panel is maximized.

**The `unsaved-changes` requirement is narrowed, and a spec-literal reading of its old scenario would now fail** → The delta rewrites that scenario to state the no-results precondition and adds the two combination cases. The existing integration test exercises a modified file with no search state, which is unaffected.

**Muscle memory in the other direction: a user expecting `q` to quit finds their results cleared instead** → The press is visibly productive — the search bar and match markers disappear — so it does not read as a dead key, and the next `q` quits.

**A future contributor adds a rung to Escape and not to `q`, or the reverse** → The two predicates are identical today and sit fifteen lines apart in the same function. Decision 6 records that they must stay identical; the added scenarios in the `response-search` delta fail if the `q` predicate drifts.
