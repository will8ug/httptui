## Context

The `save-as-rebind-filepath` change made `S` a faithful Vim `:saveas`: on success the app writes the serialized requests and rebinds `state.filePath` to the written path. The one remaining divergence from Vim is the conflict rule: httptui silently auto-renames with a ` - N` suffix where Vim refuses with `E13: File exists`. The auto-suffix produces names the user never typed and, because the rebind makes the suffixed file the new current file, repeated default-saves stack suffixes (`api - 1.http`, `api - 1 - 1.http`, ...). Empirical Vim behavior (verified on Vim 9.1): `:saveas` to an existing file refuses with E13, writes nothing, keeps the buffer name, and leaves the modified flag set; `:saveas!` forces the overwrite; successful `:saveas` to a new name rebinds the buffer and clears the modified flag.

The save overlay already has the mechanism this needs: `SET_SAVE_ERROR` renders an inline error, keeps the overlay open, and `UPDATE_SAVE_INPUT` clears it on the next keystroke.

## Goals / Non-Goals

**Goals:**

- Delete the auto-suffix conflict-resolution loop entirely (`src/app.tsx:325-336`).
- Refuse a save whose resolved target already exists: inline error in the overlay, no write, no rebind, unsaved-changes flag untouched.
- Keep the rest of the current `S` behavior unchanged: default-path derivation, rebind on success, transient "Saved N requests to <path>" message, absolute/relative resolution.
- Update the `save-as-http` and `unsaved-changes` specs and `docs/saving.md` to match.

**Non-Goals:**

- An override / force-overwrite (`!`) mechanism. The refusal keeps the overlay open, so the user edits the name; the planned in-place-save feature is the intended path for "save to my current file".
- Reverting the save rebind (the export-framing alternative from earlier exploration is superseded — Vim `:saveas` rebinds, and this change completes the Vim model rather than abandoning it).
- Changing the `isDirty` semantics beyond what refusal implies (flag simply never clears on a refused save, which is already how failed saves behave).

## Decisions

### Decision 1: Refuse through the existing `SET_SAVE_ERROR` path

The Enter handler's conflict block becomes a plain existence check:

```ts
// before: suffix loop computing finalPath
// after:
if (existsSync(targetPath)) {
  dispatch({ type: 'SET_SAVE_ERROR', error: `File exists: ${basename(targetPath)}` });
  return;
}
writeFileSync(targetPath, content, 'utf8');
dispatch({ type: 'SAVE_FILE', message: `Saved ${state.requests.length} requests to ${fileName}`, filePath: targetPath });
```

`finalPath` collapses to `targetPath` — there is no longer any divergence between the typed path and the written path, which also simplifies the transient-message wording (the written path is always the user's path). No reducer or action-type changes: `SET_SAVE_ERROR` already keeps the overlay open, and `UPDATE_SAVE_INPUT` already clears the error on input.

*Alternatives considered:*

- **A dedicated `CONFLICT` action type** — rejected; `SET_SAVE_ERROR` renders identically and adding a parallel path would duplicate the error-display machinery for no behavioral difference.
- **Refusal message mimicking E13 verbatim ("File exists (add ! to override)")** — rejected because there is no `!` override in this TUI; hinting at one would mislead. The message names the existing file; the overlay input is already focused on the offending path.

### Decision 2: No force-overwrite (`!`) in this change

Vim pairs E13 with `:saveas!`; httptui does not add an override here. In the path-input overlay there is no natural place for a `!` modifier — a typed `!` is a legal path character — and the refusal already gives the user a recoverable state (overlay open, error shown, input editable). The planned in-place-save command is the real resolution for "write to the file I have open"; until it lands, saving over an existing file requires typing a different name, exactly as in Vim without `!`.

### Decision 3: The rebind stays; the default-path-on-`.http` consequence is accepted

Because `S` on a `.http` file defaults to the current file's own basename, and the current file exists on disk, pressing `S` and confirming the default on a `.http` file now **always refuses** until the user types another name. This is precisely Vim's behavior (`:saveas` to the buffer's own name → E13), and it is the honest outcome the user asked for. The friction disappears once in-place save exists. This is the deliberate replacement for the suffix-stacking artifact: instead of silently creating `api - 1 - 1.http`, the app tells the user the target exists.

## Risks / Trade-offs

- **[Default save on a `.http` file always refuses]** → Accepted; matches Vim `:saveas`. The error message plus the overlay (showing the offending path) make the fix obvious: type a new name. The in-place-save follow-up removes the need for this flow.
- **[No way to overwrite an existing file from the TUI]** → Accepted and deliberate. Users can choose a new name or delete the target outside the TUI. An override key can be added later if real usage demands it.
- **[Stale test expectations]** → The integration tests "Conflict suffix auto-appended when file exists" and the staged "Save a second time increase the number of N" assert suffix behavior and must be replaced with refusal tests; the "Status bar shows written file name after save-as" test is unaffected. `test/core/save-operations.test.ts:144` ("rebinds filePath to the conflict-suffixed path") tests the reducer with a constructed action and remains behaviorally valid — only its name is stale.
- **[Stale Purpose line in the main `save-as-http` spec]** → The spec sync merges delta requirements but leaves the Purpose paragraph ("conflict-suffix auto-increment") untouched. Update the Purpose line in the same commit as the sync.

## Migration Plan

None required: the change touches a single code site in `src/app.tsx` and only wording in specs/docs/tests. Rollback is a revert of the implementation commit; no persisted state or API surface is involved.

## Open Questions

None blocking. Exact error-message string is an implementation detail for the apply task (spec mandates only that an error is displayed and the overlay stays open).
