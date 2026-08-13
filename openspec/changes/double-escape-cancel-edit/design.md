## Context

See proposal.md for motivation. The relevant current state:

- The edit-mode input handler in `src/app.tsx` (the `state.mode === 'edit'` branch) dispatches `CANCEL_EDIT` unconditionally on `key.escape`.
- `CANCEL_EDIT` in `src/core/reducer.ts` resets `mode` to `'normal'` and wipes `editBuffers` — no dirty check, no hint.
- Editor buffers live in `state.editBuffers: Record<EditTarget, { text: string; cursor: number }>`, seeded from the selected request by `ENTER_EDIT` (`url`, `body ?? ''`, `headersToText(headers)`).
- `COMMIT_EDIT` already computes a `changed` flag by comparing `nextUrl !== request.url || nextBody !== request.body || !headersEqual(nextHeaders, request.headers)`. That comparison is the template for the new "uncommitted changes" check, except the escape guard compares raw buffer text (including `headersToText(request.headers)`) rather than re-parsing headers.
- The transient-message mechanism (`state.transientMessage` / `state.transientError`, rendered green/red in `StatusBar.tsx`) auto-clears after `TRANSIENT_CLEAR_MS = 2000` via a `useEffect` timer in `src/app.tsx`. The status bar remains visible while the editor is open.
- The reducer is a pure function; all timing and side effects live in `src/app.tsx` (which already does file I/O and uses `Date.now` indirectly through the async executor).

## Goals / Non-Goals

**Goals:**

- A single `Esc` with uncommitted editor changes shows a transient hint and does not discard.
- Two `Esc` presses within a 2-second window discard and close, matching today's single-`Esc` behavior.
- `Esc` with no uncommitted changes closes immediately (no regression).
- The armed window is purely time-based: intermediate edits do not disarm it (per user decision).

**Non-Goals:**

- No new overlay or full confirmation prompt — the guard is a transient status-bar message only.
- No change to the file-level `isDirty`/unsaved-changes flow (that is a separate concern).
- No warning-color variant for the hint; it reuses the existing green `transientMessage`.

## Decisions

### D1: "Uncommitted changes" is a text comparison of buffers vs. stored values

A helper computes whether any tab has diverged:

- `editBuffers.url.text !== request.url`
- `editBuffers.body.text !== (request.body ?? '')`
- `editBuffers.headers.text !== headersToText(request.headers)`

Rationale: buffers are seeded exactly from these values, so a text comparison is the simplest correct test — a revert re-matches and correctly counts as "no uncommitted changes". We deliberately do **not** parse the headers buffer here: `headersToText` round-trips the stored record to the exact seed text, so raw-text equality is sufficient and cheaper than `parseHeadersText`.

Alternative considered: reuse `COMMIT_EDIT`'s `changed` formula (parses headers). Rejected — parsing is unnecessary for a discard guard and could mark a buffer "clean" when text still differs cosmetically.

### D2: A timestamp in state, not a boolean tied to the transient timer

Add `editEscapeArmedAt: number | null` to `AppState` and a new action `ARM_EDIT_CANCEL` carrying `now: number`. `app.tsx` computes `Date.now()` and passes it in the payload, keeping the reducer pure. The second-`Esc` handler compares `Date.now() - editEscapeArmedAt <= EDIT_CANCEL_WINDOW_MS`.

Rationale: the window and the hint-display duration are distinct concerns. A timestamp is self-expiring (a stale timestamp simply fails the comparison and re-arms), so no cleanup timer is required, and the hint's auto-clear continues to be handled by the existing transient-message effect.

Alternative considered: a boolean `editCancelArmed` cleared by `CLEAR_TRANSIENT_MESSAGE`. Rejected — it couples the armed window to the transient-message lifecycle, requires `CLEAR_TRANSIENT_MESSAGE` to know about edit-specific state, and still needs explicit reset points on commit/cancel.

### D3: Window constant is a named value separate from the transient duration

Add `EDIT_CANCEL_WINDOW_MS = 2000` to `src/utils/timing.ts`, equal in value to `TRANSIENT_CLEAR_MS`.

Rationale: the two durations happen to match today but mean different things (how long `Esc` stays "armed" vs. how long the hint stays visible). Keeping them separate makes a future divergence a one-line change rather than a semantics change.

### D4: Time-based only — no disarm on intermediate edits

Per the user decision, the window runs from the first `Esc` for the full 2 seconds regardless of typing, cursor movement, or tab switches in between. A second `Esc` inside the window discards; outside the window it re-arms.

Rationale: simplest rule matching "press Esc twice within 2 seconds". No extra reset points to maintain across `EDIT_KEY`/`SWITCH_EDIT_TAB`.

### D5: Armed state resets on both editor-exit paths

`COMMIT_EDIT` and `CANCEL_EDIT` both reset `editEscapeArmedAt` to `null`, and `CANCEL_EDIT` also clears the stale hint by setting `transientMessage` to `null` (the discard path). `COMMIT_EDIT` already overwrites `transientMessage` (`'Request updated'` or `null`), so no extra clearing is needed there beyond the timestamp.

Rationale: leaving a stale "Press Esc again to discard changes" message visible after the editor has closed would be confusing. The timestamp must not leak into normal mode.

### D6: Dirty check and timing live in `app.tsx`; reducer owns state transitions

`app.tsx` computes the dirty flag (it already has `selectedRequest`, `state.editBuffers`, and imports `headersToText`) and the time delta. The reducer owns `ARM_EDIT_CANCEL` (stores `now`), `CANCEL_EDIT` (reset), and `COMMIT_EDIT` (reset) — matching the existing split where `app.tsx` does I/O/timing and the reducer stays pure.

## Risks / Trade-offs

- **[A legitimate discard now needs two Esc presses]** → Intended; the hint makes the requirement discoverable. No-change `Esc` is unaffected.
- **[Stale hint after cancel]** → Mitigated by `CANCEL_EDIT` clearing `transientMessage`.
- **[Timing tests are wall-clock based]** → Existing integration tests already use real `delay()`; a 2-second window adds at most ~2s to one test (`await delay(2000 + margin)`). The `press` helper's `KEY_DELAY_MS` (50ms) is well under the window, so back-to-back `press(stdin, ESC)` reliably falls inside it.
- **[Reducer purity depends on `now` being passed in]** → Enforced by the `ARM_EDIT_CANCEL` action shape; no `Date.now()` call inside the reducer.
