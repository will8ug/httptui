## 1. Types and state shape

- [x] 1.1 In `src/core/types.ts`, add `export type EditTarget = 'body';` and `export type PendingDiscardAction = 'reload' | 'fileLoad' | 'quit';`
- [x] 1.2 In `src/core/types.ts`, widen `AppMode` to include `'edit'` and `'confirmDiscard'`
- [x] 1.3 In `src/core/types.ts`, add to `AppState`: `editTarget: EditTarget`, `editBuffer: string`, `editCursor: number`, `editScrollOffset: number`, `editHorizontalOffset: number`, `isDirty: boolean`, `pendingDiscardAction: PendingDiscardAction | null`
- [x] 1.4 In `src/core/types.ts`, define and export the `EditOp` union covering `'insert' | 'deleteBackward' | 'deleteForward' | 'left' | 'right' | 'up' | 'down' | 'lineStart' | 'lineEnd'`
- [x] 1.5 In `src/core/types.ts`, add to the `Action` union: `{ type: 'ENTER_EDIT'; target: EditTarget; buffer: string }`, `{ type: 'EDIT_KEY'; op: EditOp; insert?: string; visibleHeight: number; visibleWidth: number }`, `{ type: 'COMMIT_EDIT' }`, `{ type: 'CANCEL_EDIT' }`, `{ type: 'REQUEST_DISCARD_CONFIRM'; action: PendingDiscardAction }`, `{ type: 'CONFIRM_DISCARD' }`, `{ type: 'CANCEL_DISCARD' }`
- [x] 1.6 Run `npm run typecheck` and confirm the only errors are the not-yet-updated `createInitialState` and reducer exhaustiveness

## 2. Pure editor module

- [x] 2.1 Create `src/core/editor.ts` exporting `export interface EditorBuffer { text: string; cursor: number }`
- [x] 2.2 Implement `offsetToLineCol(text: string, offset: number): { line: number; col: number }` — clamp `offset` into `[0, text.length]`
- [x] 2.3 Implement `lineColToOffset(text: string, line: number, col: number): number` — clamp `line` into the available line range and `col` into that line's length
- [x] 2.4 Implement `insertText(buffer: EditorBuffer, insert: string): EditorBuffer` — splice at the cursor and advance by `insert.length`
- [x] 2.5 Implement `deleteBackward` and `deleteForward` — no-ops at offset 0 and at `text.length` respectively; both delete `\n` like any other character
- [x] 2.6 Implement `moveLeft` and `moveRight` — clamp at the buffer boundaries, traverse newlines
- [x] 2.7 Implement `moveUp` and `moveDown` via the two conversion helpers, clamping the column to the target line's length and returning the buffer unchanged on the first and last lines
- [x] 2.8 Implement `moveLineStart` and `moveLineEnd`
- [x] 2.9 Implement `applyEditOp(buffer: EditorBuffer, op: EditOp, insert?: string): EditorBuffer` dispatching to the functions above, so the reducer has a single entry point
- [x] 2.10 Create `test/core/editor.test.ts` covering every scenario in the `request-editing` delta spec's insert, delete, horizontal-movement, vertical-movement, and line-edge requirements, plus offset/line-column round-tripping on empty, single-line, and trailing-newline buffers

## 3. Reducer

- [x] 3.1 In `src/core/reducer.ts`, add the `ENTER_EDIT` case: set `mode: 'edit'`, `editTarget: action.target`, `editBuffer: action.buffer`, `editCursor: action.buffer.length`, and clamp `editScrollOffset`/`editHorizontalOffset` from 0 with `clampScrollOffsetToCursor` so the end-of-buffer cursor is visible on open (the action carries `visibleHeight`/`visibleWidth` for this)
- [x] 3.2 Add the `EDIT_KEY` case: call `applyEditOp`, then recompute `editScrollOffset` with `clampScrollOffsetToCursor(cursorLine, state.editScrollOffset, action.visibleHeight)` and `editHorizontalOffset` with `clampScrollOffsetToCursor(cursorVisualCol, state.editHorizontalOffset, action.visibleWidth)`, where `cursorVisualCol` uses `expandTabs` on the cursor line's prefix
- [x] 3.3 Add the `COMMIT_EDIT` case: build `nextBody = state.editBuffer === '' ? undefined : state.editBuffer`; replace `state.requests[state.selectedIndex]` immutably with `{ ...request, body: nextBody }`; set `isDirty: state.isDirty || nextBody !== request.body`; set `mode: 'normal'`; clear the edit fields; set a transient confirmation message
- [x] 3.4 Add the `CANCEL_EDIT` case: set `mode: 'normal'` and clear the edit fields without touching `state.requests`
- [x] 3.5 Add the `REQUEST_DISCARD_CONFIRM`, `CONFIRM_DISCARD`, and `CANCEL_DISCARD` cases per the `unsaved-changes` delta spec — `CONFIRM_DISCARD` clears `isDirty` and `pendingDiscardAction` and returns to normal mode; `CANCEL_DISCARD` returns to normal mode leaving `isDirty` set
- [x] 3.6 Set `isDirty: false` in the existing `SAVE_FILE`, `RELOAD_FILE`, and `LOAD_FILE` cases
- [x] 3.7 Seed the new fields in `createInitialState`: `editTarget: 'body'`, `editBuffer: ''`, `editCursor: 0`, `editScrollOffset: 0`, `editHorizontalOffset: 0`, `isDirty: false`, `pendingDiscardAction: null`
- [x] 3.8 Create `test/core/request-editing.test.ts` using `createInitialState` and `reducer` from `test/helpers/state`, covering `ENTER_EDIT` seeding, `EDIT_KEY` cursor-follow scrolling on both axes, `COMMIT_EDIT` immutability and empty-to-`undefined` normalization, unchanged-commit leaving `isDirty` false, and `CANCEL_EDIT` leaving requests untouched
- [x] 3.9 Create `test/core/unsaved-changes.test.ts` covering flag set/clear across `COMMIT_EDIT`, `SAVE_FILE`, `RELOAD_FILE`, `LOAD_FILE`, and the three confirm actions

## 4. Components

- [x] 4.1 Create `src/components/EditOverlay.tsx` as a display-only component taking `{ title: string; buffer: string; cursor: number; scrollOffset: number; horizontalOffset: number; visibleHeight: number; contentWidth: number }` — no local state, no `useInput`
- [x] 4.2 In `EditOverlay`, split the buffer on `\n`, slice the visible window, apply `expandTabs` then `shiftText`/`truncateText` from `src/utils/text.ts` for horizontal offset and truncation, matching `RequestDetailsView`'s approach
- [x] 4.3 In `EditOverlay`, render the cursor by splitting the cursor's line into before/at/after spans with `<Text inverse>` on the character at the cursor, and an inverted space when the cursor sits at end of line
- [x] 4.4 Style `EditOverlay` per the existing overlay convention — `borderStyle="round"`, `borderColor="cyanBright"`, bold `cyanBright` title, hint line reading that `Ctrl+S` saves and `Esc` cancels — sized to most of the terminal rather than `SaveOverlay`'s 48–72 column box
- [x] 4.5 Create `src/components/ConfirmDiscardOverlay.tsx` taking `{ pendingAction: PendingDiscardAction }`, rendering the unsaved-changes warning, the action that will be performed, and the `y` / `n` / `Esc` hint
- [x] 4.6 In `src/components/StatusBar.tsx`, add an `isDirty: boolean` prop and prefix the file name with `*` inside `getStatusText` when it is set
- [x] 4.7 Create `test/components/EditOverlay.test.tsx` covering cursor rendering mid-line and at end of line, viewport slicing, horizontal truncation with no overflow, and tab expansion
- [x] 4.8 Create `test/components/ConfirmDiscardOverlay.test.tsx` covering the three pending-action variants and the key hint
- [x] 4.9 Extend `test/components/StatusBar.test.tsx` with the `*`-present and `*`-absent cases across focus contexts

## 5. Input wiring in app.tsx

- [x] 5.1 In `src/app.tsx`, compute the editor's `visibleHeight` and `contentWidth` from `stdout.rows`/`stdout.columns` alongside the existing layout calculations, and pass them on every `EDIT_KEY` dispatch
- [x] 5.2 Add the `if (state.mode === 'edit') { ... }` branch to the single `useInput` handler, placed with the other mode branches before the normal-mode keys, ordered: `Escape` → `CANCEL_EDIT`; `key.ctrl && input === 's'` → `COMMIT_EDIT`; `key.ctrl && input === 'a'` or `key.home` → `lineStart`; `key.ctrl && input === 'e'` or `key.end` → `lineEnd`; `key.return` → `insert` with `'\n'`; `key.backspace` → `deleteBackward`; `key.delete` → `deleteForward`; the four arrows → their moves; then `input && !key.ctrl && !key.meta` → `insert`; finish with `return`
- [x] 5.3 Add the `if (state.mode === 'confirmDiscard') { ... }` branch handling `y`, `n`, `Escape`, and ignoring everything else; on `y`, dispatch `CONFIRM_DISCARD` and then perform the recorded action — reload reads and parses `state.filePath` exactly as the current `R` handler does, `fileLoad` dispatches `ENTER_FILE_LOAD`, and `quit` calls `exit()`
- [x] 5.4 Add the normal-mode `e` handler: no-op when there is no selected request; when `selectedRequest.formdataFields` is present, dispatch `SET_TRANSIENT_MESSAGE` with `'form-data request body is not supported to edit for now'` plus the existing 2000 ms `CLEAR_TRANSIENT_MESSAGE` timeout; otherwise dispatch `ENTER_EDIT` with `target: 'body'` and `buffer: selectedRequest.body ?? ''`
- [x] 5.5 Guard the existing `R` handler: when `state.isDirty`, dispatch `REQUEST_DISCARD_CONFIRM` with `'reload'` and return instead of reloading
- [x] 5.6 Guard the existing `o` handler: when `state.isDirty`, dispatch `REQUEST_DISCARD_CONFIRM` with `'fileLoad'` and return instead of dispatching `ENTER_FILE_LOAD`
- [x] 5.7 Guard the existing quit handler: keep `key.ctrl && input === 'c'` exiting immediately, and route bare `q` through `REQUEST_DISCARD_CONFIRM` with `'quit'` when `state.isDirty`
- [x] 5.8 Wire both new overlays into the `overlay={...}` ternary chain passed to `Layout`, and pass `isDirty={state.isDirty}` to `StatusBar`

## 6. Shortcut registry and docs

- [x] 6.1 Add `{ key: 'e', label: '', description: 'Edit request body', showInBar: false, showInHelp: true, group: 'request' }` to `SHORTCUTS` in `src/core/shortcuts.ts`
- [x] 6.2 Extend `test/core/shortcuts.test.ts` to assert the `e` entry's exact fields and that the six bar-visible shortcuts are unchanged
- [x] 6.3 Add `e` to the Request shortcuts table in `README.md`, and note in the Features list that request bodies can be edited in-session and exported with `S`

## 7. Integration tests

- [x] 7.1 Create `test/integration/request-body-editing.test.tsx` using `renderApp`, `press`, `ESC`, `ENTER`, `BACKSPACE`, and the arrow constants from `test/helpers/integration`, adding a `CTRL_S` constant (`'\u0013'`) to that helper
- [x] 7.2 Cover: `e` opens the overlay seeded with the raw body; typing and `Ctrl+S` update the request; `Escape` discards; `Enter` inserts a newline and does not close the overlay; `e` on a form-data request shows the block message
- [x] 7.3 Cover the raw-versus-resolved contract: a request whose body contains `{{var}}` shows the placeholder in the editor while the details panel shows the resolved value
- [x] 7.4 Cover export: commit an edit, press `S`, press `Enter`, and assert the written file contains the edited body — follow the temp-directory pattern in `test/integration/save-as-http.test.tsx`
- [x] 7.5 Create `test/integration/unsaved-changes.test.tsx` covering the `*` marker appearing after a commit and clearing after a save, and the confirm prompt intercepting `R`, `o`, and `q` with `y` proceeding and `n`/`Escape` abandoning

## 8. Verification

- [x] 8.1 Run `npm run typecheck` and confirm it passes with no `as any`, `@ts-ignore`, or `@ts-expect-error` anywhere in the change
- [x] 8.2 Run `npm run lint` and confirm it passes
- [x] 8.3 Run `npm test` and confirm all tests pass with no coverage regression against the badges in `README.md` — measured against a `HEAD` worktree: statements 86.46%→86.76%, branches 79.50%→79.87%, functions 96.48%→97.68%, lines 86.62%→86.84%
- [x] 8.4 Cover the risky editor behaviors with automated integration tests instead of relying on manual inspection: multi-line editing, cursor movement across line boundaries, viewport scrolling on a body taller than the overlay, and pasting a multi-line JSON body as one chunk. Also confirm `npm run build` succeeds.
- [x] 8.6 HUMAN CHECK (cannot be automated): run `httptui examples/basic.http` in a real TTY and confirm the rendered cursor position, `Ctrl+S`/`Home`/`End`/`Delete` key delivery, and paste behavior match expectations in your terminal emulator
- [x] 8.5 Confirm no unreachable branches were introduced by the single-member `EditTarget` union — `editTarget` is only ever assigned, never branched on
