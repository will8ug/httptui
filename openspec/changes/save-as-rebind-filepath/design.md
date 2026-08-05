## Context

After the `add-request-body-editing` change, `S` (save-as) is the only way to persist in-memory body edits to disk. The save flow writes a serialized copy of `state.requests` to a user-chosen path and dispatches `SAVE_FILE`. That reducer case clears `isDirty` but never touches `state.filePath` — the two fields are written asymmetrically:

- `isDirty` is cleared on **any** successful save (the "work persisted somewhere" reading).
- `state.filePath` is updated only by `LOAD_FILE` (the "which file am I editing" identity).

The `defer-dirty-clear-to-sync` change established the invariant that the flag is cleared only when in-memory state is actually synced to disk, and fixed the `CONFIRM_DISCARD` premature clear — but left the `SAVE_FILE` clear in place. The result is the awkward status-bar state in the bug report: after a save-as to a different path, the status bar shows the original loaded file name with no `*`, even though that file on disk is stale and the edits live only in the newly written file.

The chosen direction (option A) is **save-as rebinds the current file** — the Vim `:saveas` model: after a successful save, the buffer's home is the written file, the flag clears honestly, and the status bar reflects the new identity.

## Goals / Non-Goals

**Goals:**

- Make the status bar honest after a save-as: it shows the actual written file's name, clean, because that file now *is* the current file.
- On successful save, set `state.filePath` to the actual written path — including any conflict-suffix the no-overwrite rule applied.
- Keep `isDirty: false` on successful save (unchanged) — now semantically correct because the rebind makes the buffer synced to the tracked file.
- Update docs so the product wording matches the save-as-switches-file behavior.

**Non-Goals:**

- In-place save of the loaded file. This is a separate follow-up change with its own shortcut, already planned.
- Changing the no-overwrite conflict-suffix rule (`save-as-http` spec) in any way.
- Changing when `isDirty` is set, or the `*` display logic.
- Serializer fidelity (preserving comments/formatting through `serializeHttpFile`).

## Decisions

### Decision 1: `SAVE_FILE` carries the written path; the reducer rebinds `filePath`

The `SAVE_FILE` action currently carries only a message (`src/core/types.ts:222`), so the reducer has no data to rebind even if it wanted to. Thread the resolved final path through:

```ts
// types.ts — Action union
{ type: 'SAVE_FILE'; message: string; filePath: string }

// app.tsx — save-as Enter handler (after writeFileSync succeeds)
dispatch({ type: 'SAVE_FILE', message: `Saved ... to ${fileName}`, filePath: finalPath });

// reducer.ts — SAVE_FILE case
case 'SAVE_FILE':
  return {
    ...state,
    mode: 'normal',
    isDirty: false,
    filePath: action.filePath,   // NEW: rebind to the actual written path
    saveInput: '',
    saveError: null,
    transientMessage: action.message,
    transientError: null,
  };
```

`finalPath` is already computed in `app.tsx` (conflict-suffix loop) and is in scope at the dispatch site, so this is a mechanical change. `isDirty: false` stays — after rebinding, the in-memory requests are synced to the file the app tracks, so the flag is honestly clear.

*Alternatives considered:*

- **Option B (keep `filePath`, keep `isDirty` set)** — the "export" framing where the source file stays the identity. Rejected in favor of A: the user wants save-as to switch the working file (Vim `:saveas`), and this change is the coherent half of that model.
- **Rebind to the user's typed path instead of `finalPath`** — rejected. When the no-overwrite rule appends a suffix, the typed path is not where the data went; rebinding to it would re-create the same lie this change removes. Rebind to the *actual* written path, which the transient message already discloses.

### Decision 2: Keep the no-overwrite conflict rule; accept its interaction with rebinding

The `save-as-http` conflict-suffix behavior is unchanged. Consequence: after a rebind, if the current file is already a `.http` file, the next `S` default (derived from the new `filePath`) points at the current file itself, which exists, so the save writes a suffixed sibling. Repeated default-saves on a `.http` file therefore accumulate suffixes (`basic - 1.http`, `basic - 1 - 1.http`, ...).

This is accepted for now and is the explicit price of keeping the no-overwrite rule. The planned in-place-save feature is the real resolution: with a dedicated in-place save, the "save my current file" flow stops routing through the suffix machinery. This change deliberately does not touch the rule.

### Decision 3: `R` reload and `S` default follow the rebound path (documented consequences)

- `RELOAD_FILE` reads `state.filePath`, so after a save-as, `R` re-reads the written file. This is consistent with "the app switched files": the export was produced by the serializer from the same in-memory model, so a reload round-trips it. The original source is simply no longer tracked.
- `ENTER_SAVE` derives its default from `basename(state.filePath)`, so the next save defaults to the rebound file's name automatically. No code change needed.

### Decision 4: Docs describe save-as as switching the current file

The README feature blurb ("export the result") and `docs/saving.md` get a sentence noting that after a successful save, the app switches to the saved file (the status bar shows its name, and `R` reloads it). This aligns product copy with the new behavior.

## Risks / Trade-offs

- **[Suffix accumulation on repeated default-saves of a `.http` file]** → Accepted and documented as out of scope; the in-place-save follow-up resolves it. The transient message always shows the actual written path.
- **[Status bar may show an auto-suffixed name the user did not type]** (`basic - 1.http` when the user accepted `basic.http`) → The transient message already discloses the actual path; docs updated to state that the app switches to the actual written path.
- **[Postman-collection identity shift]** — load `MyAPI.json`, save-as to `MyAPI.http`, then `R` re-reads `MyAPI.http` instead of the collection → Consistent with save-as-rebind semantics; the user opted into the `.http` file by saving it.
- **[Round-trip canonicalization]** — `R` after a save-as re-parses the serializer's canonical output; formatting/comments are not part of the model → The tracked file is always a file the serializer produced, so reload is stable; no user-authored formatting is at risk (the original source is only ever re-read if the user reopens it).

## Migration Plan

None required: this is reducer-internal behavior with no persisted data or API surface. Rollback is a revert of the implementation commit.

## Open Questions

None blocking. The follow-up in-place-save change will revisit the default-path/overwrite interplay that Decision 2 defers.
