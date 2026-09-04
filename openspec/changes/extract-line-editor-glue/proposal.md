## Why

After the save-response change, the three single-line input handlers — file load, save-as-.http, and response save — each carry an identical ~42-line key-dispatch block (home/end, backspace/delete, arrows, printable insert). The archived `save-response-to-file` design (D5) explicitly accepted the third copy as a temporary measure, naming extraction as the follow-up. The pure editing operations are already shared in `src/core/editor.ts`; only the dispatch glue is duplicated three times.

## What Changes

- Add a module-private `applyLineEdit` helper in `src/app/input-handlers.ts` that encapsulates the key → editor-op → dispatch mapping, parameterized by the input buffer and two callbacks (`moveCursor` for cursor-only actions, `updateInput` for text-changing actions).
- Replace the three duplicated blocks in `handleFileLoadInput`, `handleSaveInput`, and `handleResponseSaveInput` with thin calls to that helper.
- No change to action types, reducers, state shape, or components. Observable behavior is byte-for-byte identical.

## Capabilities

### New Capabilities

None — pure refactor with no observable behavior change.

### Modified Capabilities

None — this change declares `skip_specs: true` (the opt-out for pure refactors/tooling/docs). No requirement changes; inventing a spec requirement just to satisfy validation would violate the spec-driven guidance.

## Impact

- `src/app/input-handlers.ts` only: ~126 lines of duplicated dispatch collapse to one ~30-line helper plus three short call sites.
- No dependency, API, or data-model changes.
- Covered by the existing integration suites (`file-load.test.tsx`, `save-as-http.test.tsx`, `save-response.test.tsx`), which exercise these exact key sequences and must continue to pass unchanged.
