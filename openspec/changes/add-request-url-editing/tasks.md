## 1. Types and state shape

- [x] 1.1 In `src/core/types.ts`, widen `EditTarget` to `'body' | 'url'` and remove the now-obsolete single-member comment
- [x] 1.2 In `src/core/types.ts`, replace `AppState.editBuffer: string` and `AppState.editCursor: number` with `editBuffers: Record<EditTarget, { text: string; cursor: number }>` (keep `editTarget`, `editScrollOffset`, `editHorizontalOffset`)
- [x] 1.3 In `src/core/types.ts`, change the `ENTER_EDIT` action to `{ type: 'ENTER_EDIT'; buffers: Record<EditTarget, string>; visibleHeight: number; visibleWidth: number }` (the reducer always activates `'url'` on entry, so no target is carried)
- [x] 1.4 In `src/core/types.ts`, add `{ type: 'SWITCH_EDIT_TAB'; target: EditTarget; visibleHeight: number; visibleWidth: number }` to the `Action` union
- [x] 1.5 Run `npm run typecheck` and confirm the only errors are the not-yet-updated reducer, `createInitialState`, `app.tsx`, and tests

## 2. Reducer

- [x] 2.1 Update the `ENTER_EDIT` case: seed `editBuffers` from `action.buffers` with each cursor at the end of its text, set `mode: 'edit'` and `editTarget: 'url'`, and clamp `editScrollOffset`/`editHorizontalOffset` from 0 against the URL cursor (the action carries `visibleHeight`/`visibleWidth` for this)
- [x] 2.2 Update the `EDIT_KEY` case: apply `applyEditOp` to the **active** target's buffer; when `editTarget` is `'url'`, strip `\n` and `\r` from `action.insert` before applying (this turns the `key.return` dispatch into a no-op and sanitizes pastes — design Decision 4); recompute both scroll offsets from the active buffer's cursor exactly as today
- [x] 2.3 Add the `SWITCH_EDIT_TAB` case: no-op when `action.target === state.editTarget`; when the target is `'body'` and the selected request carries `formdataFields`, return state unchanged except the existing form-data transient message; otherwise set `editTarget` and recompute both scroll offsets from the restored buffer's cursor, clamped from 0 so the cursor is visible on the first frame after the switch
- [x] 2.4 Update the `COMMIT_EDIT` case per design Decision 5: `nextBody = buffers.body.text === '' ? undefined : buffers.body.text`, `nextUrl = buffers.url.text`, `changed = nextBody !== request.body || nextUrl !== request.url`; replace the request immutably with both fields and `isDirty: req.isDirty || changed`; set `transientMessage: 'Request updated'` only when `changed`; return to normal mode and reset the edit fields
- [x] 2.5 Update the `CANCEL_EDIT` case: return to normal mode, clear both buffers, reset `editTarget` to `'url'`, zero the offsets, leave `state.requests` untouched
- [x] 2.6 Update `createInitialState`: `editTarget: 'url'`, both edit buffers `{ text: '', cursor: 0 }`
- [x] 2.7 Update `test/core/request-editing.test.ts` to the new state shape and add reducer coverage for: entry seeding both buffers with the URL tab active; URL-target newline stripping (Enter no-op and multi-character input with embedded newlines); tab switching preserving both buffers and cursors and re-clamping scroll offsets; the form-data refusal on switching to the body tab; commit writing both targets with per-field change detection; the unchanged-commit case leaving `isDirty` unset and showing no message; cancel discarding both buffers

## 3. Components

- [x] 3.1 In `src/components/EditOverlay.tsx`, add `tabs: EditTarget[]` and `activeTab: EditTarget` props and render the tab strip row beneath the title — one label per target (`url`, `body`), the active label inverted, inactive labels gray; update the hint line to `Shift+Tab to switch, Ctrl+S to save, Esc to cancel` (design Decision 7)
- [x] 3.2 Update `test/components/EditOverlay.test.tsx`: assert the strip renders both labels with the active one distinguished and the new hint line; keep the existing cursor-rendering, viewport-slicing, truncation, and tab-expansion tests passing

## 4. Input wiring in app.tsx

- [x] 4.1 Update the normal-mode `e` handler: remove the form-data entry block (the guard moves to tab switching — design Decision 6) and dispatch `ENTER_EDIT` with `buffers: { url: selectedRequest.url, body: selectedRequest.body ?? '' }` plus the editor dimensions
- [x] 4.2 In the `state.mode === 'edit'` branch, add a `key.tab && key.shift` check that computes the next target in strip order (`url` → `body` → `url`) and dispatches `SWITCH_EDIT_TAB` with the editor dimensions; place it before the printable-insert branch (Shift+Tab arrives with `input === ''`, so the insert branch cannot misfire)
- [x] 4.3 Leave the `key.return` branch unchanged — it dispatches `insert: '\n'` uniformly and the reducer strips it for the URL target
- [x] 4.4 Update the overlay wiring: pass `title="Edit Request"`, `tabs`, `activeTab: state.editTarget`, and read `buffer`/`cursor` from `editBuffers[state.editTarget]`

## 5. Shortcut registry and docs

- [x] 5.1 In `src/core/shortcuts.ts`, change the `e` entry's description to `'Edit request URL or body'` and add `{ key: 'Shift+Tab', label: '', description: 'Switch editor tab', showInBar: false, showInHelp: true, group: 'edit' }` alongside the other `edit`-group entries
- [x] 5.2 Update `test/core/shortcuts.test.ts` to assert the `e` entry's new description, the `Shift+Tab` entry's exact fields, and that the six bar-visible shortcuts are unchanged
- [x] 5.3 Update `README.md`: the Features bullet becomes in-session editing of request URLs and bodies; the Request shortcuts table row for `e` reflects the tabbed editor; the Edit shortcuts table gains a `Shift+Tab` row

## 6. Integration tests

- [x] 6.1 Add a `SHIFT_TAB` constant (`'\u001b[Z'`) to `test/helpers/integration.tsx` alongside the existing key constants
- [x] 6.2 Update `test/integration/request-body-editing.test.tsx` for the tabbed flow: `e` now opens the URL tab, so body-editing scenarios begin with `e` then `SHIFT_TAB`
- [x] 6.3 Create `test/integration/request-url-editing.test.tsx` covering: `e` opens the editor with the URL tab active and the raw URL seeded (placeholders verbatim while the details panel shows the resolved value); typing and `Ctrl+S` update the request and the details panel; `Shift+Tab` switches tabs preserving in-progress edits in both directions; `Enter` is a no-op in the URL tab; pasted newlines are stripped; on a form-data request `e` opens the editor, switching to the body tab shows the refusal message, and a URL edit still commits; a no-op commit shows no message and sets no dirty marker
- [x] 6.4 Cover persistence of a committed URL edit: save-as (`S`) writes the edited request line (temp-directory pattern from `save-as-http.test.tsx`), and an in-place save (`Ctrl+S` in normal mode, `y` to confirm) writes the edited URL into the source file leaving lines outside the request's block unchanged
- [x] 6.5 Fix `EDITOR_VERTICAL_CHROME` (6 → 7) in `src/utils/layout.ts` and its `test/utils/layout.test.ts` mirror expectations — the tab strip adds a chrome row; caught by the viewport integration test during 6.2

## 7. Verification

- [x] 7.1 Run `npm run typecheck` and confirm it passes with no `as any`, `@ts-ignore`, or `@ts-expect-error` introduced
- [x] 7.2 Run `npm run lint` and confirm it passes
- [x] 7.3 Run `npm test` and confirm all tests pass with no coverage regression against the badges in `README.md`
- [x] 7.4 Run `npm run build` and confirm it succeeds
- [x] 7.5 HUMAN CHECK (cannot be automated): run `httptui examples/basic.http` in a real TTY and confirm Shift+Tab delivery and tab-strip rendering, edit a URL and send the request, open the editor on a form-data request and confirm the body-tab refusal, and repeat the Shift+Tab check inside tmux if available
- [x] 7.6 Replace per-dispatch-site `scheduleTransientClear` arming with a declarative auto-clear effect keyed on the transient message state — the Shift+Tab refusal message never faded because its dispatch site forgot to arm the timer. The status-bar spec gained the universal auto-clear semantics; the reload regression test was re-spec'd to the text-keyed window.
