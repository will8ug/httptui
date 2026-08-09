## Context

The body-editing change fixed the extension seam this change consumes: `mode: 'edit'` carries an `editTarget`, and `src/core/types.ts` marks the single-member union with "widen to `| 'url' | 'headers'` only when those editors exist." This is the first widening.

Current mechanics being extended:

- `ENTER_EDIT` carries `{ target, buffer, visibleHeight, visibleWidth }` and seeds one buffer; `EDIT_KEY` applies pure ops from `src/core/editor.ts` to that buffer; `COMMIT_EDIT` writes `state.editBuffer` to `request.body` only; `CANCEL_EDIT` discards.
- `EditOverlay` is a display-only component taking `{ title, buffer, cursor, scrollOffset, horizontalOffset, visibleHeight, contentWidth }`; `app.tsx` passes a hardcoded `title="Edit Body"`.
- The `e` handler in `app.tsx` refuses entry outright for form-data requests.
- Key delivery facts (verified against Ink v7 source and production Ink apps): Shift+Tab arrives as backtab (`ESC [ Z`) and is reported by `useInput` as `key.tab === true && key.shift === true` with `input === ''`. Ctrl+Tab is byte-identical to plain Tab in legacy terminal encoding and is frequently intercepted by terminal emulators for their own tab switching. Plain Tab is inert in edit mode today — no branch handles `key.tab`, and Ink blanks `input` to `''` for non-alphanumeric keys, so nothing is inserted.
- Persistence paths need no work: `buildInPlaceContent` re-serializes the whole block of every dirty request via `serializeRequestBlock`, whose first content line is `${method} ${url}`; `S` export and the request-details panel likewise read the in-memory `request.url`.
- The `unsaved-changes` spec is already field-agnostic ("a committed edit that changes a request's stored value"), so it needs no delta.

## Goals / Non-Goals

**Goals:**

- Edit the selected request's URL in-session, operating on raw text with `{{var}}` placeholders preserved.
- One editing session can touch both URL and body without losing either in-progress edit.
- Reuse the existing overlay and pure editor machinery; add no components, no dependencies.
- Preserve the architectural invariants: one `useInput`, pure reducer, display-only components.
- Keep the seam honest for the future headers tab: the tab strip and per-target buffers must accommodate a third target without reshaping state.

**Non-Goals:**

- The headers tab itself (header editing needs key/value structure and commit-time parse validation — its own change).
- Method editing.
- Commit-time URL validation; malformed or empty URLs surface as send-time errors, as today.
- Changes to send, display, save-as, or in-place-save code paths.
- Undo/redo, `$EDITOR` handoff, grapheme-correct column widths.

## Decisions

### Decision 1: Per-target session buffers, committed together

`AppState` replaces `editBuffer`/`editCursor` with:

```ts
editBuffers: Record<EditTarget, { text: string; cursor: number }>
```

`ENTER_EDIT` seeds both buffers from the raw request (`url` verbatim, `body ?? ''`), places each cursor at the end of its buffer, and records the active target. `EDIT_KEY` applies to the active target's buffer. `SWITCH_EDIT_TAB` flips the active target and recomputes the scroll offsets from the restored cursor (clamped from 0, exactly as `ENTER_EDIT` does) so the cursor is visible on the first frame after a switch. `COMMIT_EDIT` writes every buffer to its field. The single `editScrollOffset`/`editHorizontalOffset` pair always describes the active tab and is recomputed on every keystroke and every switch.

*Alternative considered — auto-commit each tab on switch.* Rejected: `Escape` could no longer discard the session cleanly (a previously auto-committed tab would already have set the dirty marker), and the cancel-versus-commit line the body editor established would blur.

*Alternative considered — one buffer plus a nullable stash for the inactive tab.* Rejected: identical behavior with worse typing and a special-case shape that the headers tab would immediately outgrow.

### Decision 2: The URL tab is active on open

`e` opens the editor with `editTarget: 'url'`. The URL is the cheaper, more frequent tweak and is this change's motivation.

The honest cost: `e`-then-type no longer edits the body — existing muscle memory now needs one `Shift+Tab` first. Accepted deliberately; the tab strip makes the mapping visible at the moment it matters, and the help overlay documents the switch key.

### Decision 3: `Shift+Tab` switches tabs

Detected in the edit branch as `key.tab && key.shift`.

*Alternative considered — `Ctrl+Tab`.* Rejected: undeliverable. Legacy terminals send the same byte for Ctrl+Tab as for Tab (`0x09`), so Ink cannot distinguish them outside the kitty keyboard protocol, and several emulators (Windows Terminal, iTerm2, Terminal.app) intercept Ctrl+Tab for their own tab switching before the application sees it.

*Alternative considered — plain `Tab` (Postman-style field navigation).* Rejected, though viable (plain Tab is inert in the editor today): the app already uses Tab for "move focus between panels" in normal mode, so Shift+Tab reads as the same gesture family applied inside the editor, and leaving plain Tab unbound preserves the option of a future tab-insertion binding without a second breaking change.

With two tabs, "next tab" is a toggle; the cycle follows strip order (`url` → `body` → `url`) so a third tab slots in without redefinition.

### Decision 4: Single-line enforcement lives in the reducer

When `editTarget` is `'url'`, `EDIT_KEY` strips `\n` and `\r` from any `insert` payload before applying the op. The `key.return` branch in `app.tsx` therefore needs no target awareness — it dispatches `insert: '\n'` as usual and the reducer turns it into a no-op. Newlines arriving inside a multi-character paste are stripped by the same path. The invariant "a URL buffer never contains a newline" exists in exactly one place and is unit-testable in reducer tests without simulating key events.

*Alternative considered — branch on the target in `app.tsx` (skip dispatch).* Rejected: it splits the invariant across layers and gives the paste path a place to forget it.

The body tab is untouched: `Enter` still inserts `\n` there.

### Decision 5: `COMMIT_EDIT` applies both targets with per-field change detection

```ts
const nextBody = buffers.body.text === '' ? undefined : buffers.body.text;
const nextUrl = buffers.url.text;
const changed = nextBody !== request.body || nextUrl !== request.url;
```

The request is replaced immutably with both fields written and `isDirty: req.isDirty || changed`; the transient message is `'Request updated'` when `changed`, absent otherwise. The empty-to-`undefined` normalization stays body-specific: `url` is a required string, so the URL buffer commits verbatim — including an empty string, which then fails at send time like any malformed URL (consistent with the no-commit-time-validation non-goal).

The message text changes from `'Body updated'` to `'Request updated'` regardless of which target changed: one commit, one message.

### Decision 6: The form-data guard moves from entry to the body tab

`e` always opens the editor. For a form-data request, the body buffer seeds empty and `SWITCH_EDIT_TAB` to `'body'` is refused in the reducer (state unchanged except the transient message, which reuses the existing text verbatim). This keeps the invariant "form-data bodies are not editable" while making the URL of a form-data request editable — the previous behavior blocked a URL edit for no representational reason.

### Decision 7: Tab strip presentation, minimal chrome

`EditOverlay` gains `tabs: EditTarget[]` and `activeTab: EditTarget` props and renders one strip row beneath the title: each label shown as its target name, the active label inverted, inactive labels gray. The title becomes the static `'Edit Request'` — the strip carries target identity. The hint line becomes `Shift+Tab to switch, Ctrl+S to save, Esc to cancel`. Only the two existing targets render; no disabled `headers` placeholder.

### Decision 8: Persistence paths are spec-pinned, not code-touched

No changes to `in-place-save.ts`, `http-serializer.ts`, or send/display code. Because in-place save rewrites a dirty request's entire block (request line included), a committed URL edit persists through both `Ctrl+S`-in-normal-mode and `S`. The `request-editing` delta gains scenarios pinning this so a future serializer regression fails tests rather than silently dropping URL edits.

## Risks / Trade-offs

- **Shift+Tab delivery varies outside xterm-class terminals** (some tmux/screen configs and a few emulators swallow it). → The key is shown on the overlay's hint line and in the help overlay at the moment of need; tasks include a real-TTY human check, as the body editor did for `Ctrl+S`/`Home`/`End`.
- **`e`-then-type muscle memory breaks** (Decision 2). → Called out in the README shortcut table description and accepted as a one-time cost; the body is one `Shift+Tab` away.
- **Pasting a multi-line URL strips newlines silently** (Decision 4). → The alternative (a newline that only surfaces as a send-time failure) is worse; stripping is the kinder surprise, and the cursor advance reflects the stripped length.
- **An empty URL buffer commits as an empty URL** and fails at send time. → Accepted; consistent with no commit-time validation and with how a malformed URL behaves today.
- **Two tabs is the strip's minimum viable moment.** The chrome cost is real but small, and building it now — rather than when headers lands — is what keeps this change's state shape honest (Decision 1) instead of introducing a second migration.
