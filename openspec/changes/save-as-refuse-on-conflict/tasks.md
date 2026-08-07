## 1. Save handler implementation

- [ ] 1.1 Replace the conflict-suffix loop in `src/app.tsx` (save overlay Enter handler, ~lines 325-336) with a plain existence check: if `existsSync(targetPath)`, dispatch `SET_SAVE_ERROR` (message like `File exists: <basename>`) and return — no write, no rebind.
- [ ] 1.2 Collapse `finalPath` to `targetPath` on the success path — `writeFileSync(targetPath, ...)` and `SAVE_FILE` dispatch use the resolved target path directly; delete the `suffix`/`basePart`/`extPart` machinery and its comment.
- [ ] 1.3 Verify no other code site performs suffix conflict resolution (reducer/`SAVE_FILE` untouched; `SET_SAVE_ERROR` already keeps the overlay open and `UPDATE_SAVE_INPUT` clears the error).

## 2. Tests

- [ ] 2.1 Replace `test/integration/save-as-http.test.tsx` "Conflict suffix auto-appended when file exists" (lines 114-144) with a refusal test: pre-create `test-collection.http`, press `S`+`Enter`, assert the overlay shows the error, `test-collection.http` content is unchanged, and no ` - N` sibling file was created.
- [ ] 2.2 Replace the staged "Save a second time increase the number of N" test (lines 146-178) with a repeated-refusal test: on a pre-created `.http` file, `S`+`Enter` refuses, and a second `S`+`Enter` refuses again — assert only the original file exists (no stacked names).
- [ ] 2.3 Add a refusal-recovery test: after a refusal, type a new name and `Enter` — the save succeeds, the file is written, the status bar shows the new file (rebind retained), and the error cleared on the first keystroke.
- [ ] 2.4 Update `test/core/save-operations.test.ts` "rebinds filePath to the conflict-suffixed path on save-as" — rename to drop the stale "conflict-suffixed" wording (the reducer behavior it tests is unchanged).
- [ ] 2.5 Run the full test suite and typecheck/lint; all green including the untouched "Status bar shows written file name after save-as" and "Enter writes file" tests.

## 3. Docs and specs

- [ ] 3.1 Update `docs/saving.md`: remove the "` - N` suffix is automatically appended" sentence; state that saving to an existing file is refused with an inline error and the overlay stays open so the path can be edited.
- [ ] 3.2 At spec sync time, update the `save-as-http` main spec Purpose line (drop "conflict-suffix auto-increment") — the delta sync does not touch it (see design.md Risks).
