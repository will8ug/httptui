## 1. Input routing

- [ ] 1.1 Add `handleFullscreenInput` to `src/app/input-handlers.ts` implementing the design.md pseudocode (exits/safety block, navigation block, response-only block, silent no-op default), and route to it from the top of `handleNormalInput` when `state.maximizedPanel !== null`. Verify with `npx tsc --noEmit`.
- [ ] 1.2 Extract the shared `n`/`N` match-target computation (max-offset + visual-start mapping) into a helper reused by both handlers, so the dispatched `NEXT_MATCH`/`PREV_MATCH` payloads are identical. Verify existing search tests pass: `npx vitest run test/integration/search.test.tsx`.
- [ ] 1.3 Remove the now-dead fullscreen guards from `handleNormalInput` (Escape-exits-fullscreen branch, `maximizedPanel === null` conjunct on `Tab`, `maximizedPanel !== 'details'` conjunct on `d`). Verify `npx tsc --noEmit` and full test run in task 4.x.

## 2. Update the one reversed test

- [ ] 2.1 Reframe `test/integration/request-cancel.test.tsx` "Escape while loading in fullscreen cancels but stays fullscreen": send via Enter in normal mode, press `f` while loading, then Escape — assert cancel happens and fullscreen persists. Verify `npx vitest run test/integration/request-cancel.test.tsx`.

## 3. New integration coverage

Create `test/integration/fullscreen-keys.test.tsx` covering the delta specs (use the existing `renderApp`/`press` helpers; `test/integration/search-dismiss.test.tsx` is the pattern for entering fullscreen):

- [ ] 3.1 Universal keys: navigation moves selection in maximized requests panel; `G` jumps in maximized response; `?` opens help over fullscreen and closing it restores fullscreen; `Ctrl+C` exits from fullscreen.
- [ ] 3.2 Action keys are no-ops: `Enter` sends nothing from maximized response and maximized requests (no loading indicator, fullscreen persists); `o` opens no file-load overlay; `Ctrl+G` does not suspend; one test each for `s`/`S`/`p`/`y`/`E`/`e`/`R`/`Ctrl+S` opening nothing and changing nothing.
- [ ] 3.3 `q` split: with no search results, `q` in fullscreen does not exit and (with unsaved edits) opens no confirmation prompt; `f` then `q` exits; with results displayed in maximized response, `q` dismisses and stays fullscreen (regression guard alongside `search-dismiss.test.tsx`).
- [ ] 3.4 Display toggles: `w` toggles wrap in maximized response (title reflects it); `v`/`r`/`w` in maximized requests/details change nothing (verify post-exit render unchanged).
- [ ] 3.5 Search keys: `/` in maximized requests/details stays in normal mode (no search bar); `/` in maximized response enters search; `n`/`N` in maximized non-response panels with active results do not move the match index.
- [ ] 3.6 `d` no-op in all fullscreen: `d` in maximized requests with details hidden keeps details hidden after exiting fullscreen; `d` in maximized details keeps the panel visible.

## 4. Verification and docs

- [ ] 4.1 Run the full suite and confirm green: `npx vitest run` (note any pre-existing failures unrelated to this change).
- [ ] 4.2 Update README shortcut tables with fullscreen qualifiers only (registry, help overlay, and status bar untouched): `Enter` (Request table), `q` (General and Search tables), `v`/`r`/`w` and `/`/`n`/`N` (response-fullscreen note in Display and Search tables), plus a short "While a panel is fullscreen, only navigation and panel-appropriate keys are active" note. Verify no `src/core/shortcuts.ts` change ships.
- [ ] 4.3 Run `openspec validate "fullscreen-key-restrictions" --strict` and confirm the change still validates after any task-driven wording fixes.
