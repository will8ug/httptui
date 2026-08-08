# Tasks: add-in-place-save

## 1. Serializer groundwork

- [ ] 1.1 Export `serializeRequestBlock` from `src/core/http-serializer.ts` (currently module-private `function`) so the in-place builder can reuse it unchanged.
- [ ] 1.2 Add a unit test in `test/core/http-serializer.test.ts` asserting the exported `serializeRequestBlock` emits the canonical block (separator, request line, headers, blank line, body) for a single request.

## 2. Core builder module

- [ ] 2.1 Implement `src/core/in-place-save.ts` exporting `buildInPlaceContent(rawContent: string, currentRequests: ParsedRequest[]): { ok: true; content: string; editedCount: number } | { ok: false; error: string }`. Follow the design pseudocode exactly: split raw by `'\n'`; re-parse with `parseHttpFile`; mark edited where `body` differs; refuse (`ok: false`) if any edited body line matches `/^#{3,}/` after `trim()`; compute per-edited-request regions (blockStart = nearest `^#{3,}` line above `lineNumber` else the request line; blockEnd = line before next `^#{3,}` else last line, trailing blank lines trimmed); regenerate via `serializeRequestBlock`; convert `\n` to `\r\n` when `rawContent.includes('\r\n')`; splice bottom-up; return joined content.
- [ ] 2.2 Create `test/core/in-place-save.test.ts` covering every spec scenario: no body differs → no write (`editedCount === 0`, content unchanged); one of several requests edited → only that block changes and others are byte-identical; multiple edited blocks spliced correctly; form-data request block never rewritten; comments/variables/blank lines outside a block preserved; separator-less first request gains `### Request 1`; comments above a separator-less first request survive; bare `###` normalized to `### Request N`; named `### Get Users` preserved; header spacing normalized inside an edited block (`Content-Type:application/json` → `Content-Type: application/json`); inter-block blank gap preserved; CRLF source stays CRLF and LF source stays LF; EOF trailing-newline convention preserved; edited body containing a `###` line returns `ok: false` with an error.

## 3. App wiring

- [ ] 3.1 Add a `Ctrl+S` branch to the normal-mode key handler in `src/app.tsx` (near the existing `S` branch): read `state.filePath` with `readFileSync`; if `detectFormat(filePath, content) !== 'http'` dispatch a transient message pointing at `S` and return; call `buildInPlaceContent`; on `ok: false` dispatch the error as a transient message; on `ok: true` with `editedCount === 0` return silently; otherwise `writeFileSync(state.filePath, result.content, 'utf8')`, dispatch `{ type: 'SAVE_FILE', message: \`Saved ${editedCount} request(s) to ${basename(state.filePath)}\`, filePath: state.filePath }`, and `scheduleTransientClear()`. Ensure the branch fires before any generic input fallthrough and does not collide with the edit-mode `Ctrl+S` commit.
- [ ] 3.2 Add the in-place save entry to `SHORTCUTS` in `src/core/shortcuts.ts`: `{ key: 'Ctrl+S', label: '', description: 'Save to source file', showInBar: false, showInHelp: true, group: 'request' }`.
- [ ] 3.3 Update `test/core/shortcuts.test.ts` (and any help-overlay assertions) for the new registry entry: present in the registry with the exact properties, absent from the status bar, rendered in the Request group of the help overlay.

## 4. Integration tests

- [ ] 4.1 Create `test/integration/in-place-save.test.tsx` exercising the full flow with the app renderer: edit a body (`e` → `Ctrl+S`), press `Ctrl+S` in normal mode, and assert the source file on disk contains the edited body with other blocks/comments byte-identical; assert the `*` unsaved-changes marker clears and the status bar still shows the original file name; assert a Postman-loaded source shows the hint and writes nothing; assert a clean `Ctrl+S` writes nothing; assert the refused case (edited body containing `###`) writes nothing and keeps the marker.

## 5. Docs and verification

- [ ] 5.1 Update `docs/saving.md` to document in-place save (`Ctrl+S` saves edits back to the source `.http` file; `S` saves as a new file), the http-format-only gate, and the surgical-block behavior.
- [ ] 5.2 Run the full verification: `npm run lint`, `npx tsc --noEmit`, and `npm test` — all pass with the new tests green and no regressions in `save-operations`, `unsaved-changes`, `request-editing`, or `save-as-http` integration suites.
