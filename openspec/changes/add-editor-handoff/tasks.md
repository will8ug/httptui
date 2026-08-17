## 1. Prelude: hand the alternate screen to Ink

- [x] 1.1 In `src/cli.tsx`, pass the `alternateScreen` render option to `render()` so Ink owns the alternate screen buffer.
- [x] 1.2 Remove the manual `\u001B[?1049h` write, the `restoreScreen` helper, the `alternateScreenActive` flag, and the `.finally(restoreScreen)` handler now superseded by Ink.
- [x] 1.3 Verify by hand that launching and quitting (`q` and `Ctrl+C`) still restores the previous terminal contents, and that startup failures — missing file, unparseable file, no requests found — still print to the normal screen rather than being swallowed by the alternate buffer.

## 2. Fourth intercepted action

- [x] 2.1 Add the external-editor variant to `PendingDiscardAction` in `src/core/types.ts`.
- [x] 2.2 Add the matching branch to the action-description switch in `src/components/ConfirmDiscardOverlay.tsx` so the prompt names the pending handoff. Confirm the compiler flags the switch before the branch is added (the switch has no `default`).
- [x] 2.3 Confirm no reducer change is needed — the discard-confirm cases are generic over the action type.

## 3. Editor launch

- [x] 3.1 Add a module that resolves the editor command from `VISUAL`, then `EDITOR`, then a platform default.
- [x] 3.2 In the same module, launch the resolved command on a given file path with inherited stdio, asynchronously (not synchronously — see design Decision 3), resolving when the child exits and rejecting only when it fails to launch.
- [x] 3.3 Wrap the launch in Ink's terminal suspension so the TUI releases and reclaims the terminal around the child process.
- [x] 3.4 Make the launcher substitutable so tests can drive it without spawning a real editor (design Decision 7).

## 4. Trigger and gates

- [x] 4.1 Add the `Ctrl+G` normal-mode branch in `src/app.tsx`, placed so it does not shadow the existing bare `g` and `G` bindings.
- [x] 4.2 Gate on source format first: read the file, and when `detectFormat` does not return the http format, show the transient refusal and return without prompting or launching.
- [x] 4.3 Gate on unsaved changes second: when any request is dirty, dispatch the discard-confirm request with the new pending action instead of launching.
- [x] 4.4 Add the matching arm to the post-confirmation switch so confirming performs the handoff.

## 5. Return handling

- [x] 5.1 Record the source file's modification timestamp immediately before launching the editor.
- [x] 5.2 On return, compare timestamps and take no action at all when unchanged — no reload, no message.
- [x] 5.3 When changed, read and parse the file; on success with at least one request, dispatch the existing reload action so selection-preservation and the transient confirmation come from the established path.
- [x] 5.4 When changed and the file parses to zero requests, show the no-requests-found transient and leave the loaded requests untouched.
- [x] 5.5 When changed and the read or parse throws, dispatch the existing reload-error action so the requests, response, and search state are preserved.
- [x] 5.6 When the editor fails to launch, show a transient error and change nothing else.

## 6. Shortcut registry

- [x] 6.1 Add the `Ctrl+G` entry to `SHORTCUTS` in `src/core/shortcuts.ts` in the edit group, help-only.

## 7. Tests

- [x] 7.1 Cover the format gate: Postman and OpenAPI sources are refused with a transient message, no prompt, no launch; an http source proceeds.
- [x] 7.2 Cover editor resolution precedence: `VISUAL` over `EDITOR`, `EDITOR` when `VISUAL` is unset, default when neither is set.
- [x] 7.3 Cover the unmodified-file path: the fake editor touches nothing, and no reload, no message, and no state change results — including that a dirty marker survives a confirmed handoff that changed nothing.
- [x] 7.4 Cover the modified-file path: the fake editor adds a request, changes a file variable, and edits a non-selected request; assert the new request appears, the variable resolves to its new value, and the selection is preserved by name.
- [x] 7.5 Cover exit-status independence: a fake editor that saves and exits non-zero still loads the changes; one that exits zero without saving changes nothing.
- [x] 7.6 Cover the unparseable-file path: previous requests, the current response, and the unsaved-changes markers all survive, and a transient error is shown.
- [x] 7.7 Cover the zero-request path: the previous requests and the selection survive, and the no-requests-found message is shown.
- [x] 7.8 Cover the launch failure path: a nonexistent editor command reports a transient error and leaves the session untouched.
- [x] 7.9 Cover the discard-confirm integration: `Ctrl+G` with a dirty request opens the prompt and launches nothing; `y` proceeds to the handoff; `n` and `Escape` abandon with the markers still set; a format-refused source never reaches the prompt.
- [x] 7.10 Cover the shortcut registry entry: present in the edit group, absent from the status bar, present in the help overlay.
- [x] 7.11 Cover mode isolation: `Ctrl+G` is inert in the request editor and in the file-load overlay.

## 8. Documentation

- [x] 8.1 Add `Ctrl+G` to the Edit shortcuts table in `README.md`, and note that the configured editor must block until it is closed.

## 9. Verification

- [x] 9.1 Run lint, typecheck, and the full test suite; confirm no pre-existing failures were introduced.
- [x] 9.2 Exercise the feature by hand in a real terminal with a terminal editor: confirm the editor takes over cleanly, the interface repaints fully on return with no residue, and keyboard input resumes.
- [x] 9.3 Run `openspec validate add-editor-handoff --strict`.

## 10. Editor command with arguments

- [x] 10.1 In `src/core/editor-launcher.ts`, split the resolved editor value on whitespace and launch the first token as the executable with the remaining tokens as arguments ahead of the file path, without a shell (see design Decision 3).
- [x] 10.2 Extend the editor-launcher unit tests: a value with arguments launches with the arguments preceding the file path, and a multi-token command that does not exist still rejects as a launch failure.
- [x] 10.3 State in `docs/editing.md` that the editor value may include arguments such as `code --wait`.
- [x] 10.4 Re-run the full suite, typecheck, and `openspec validate add-editor-handoff --strict`.
