## Context

`AppState.error: ErrorInfo | null` (declared `src/core/types.ts:128`) is the error of the last HTTP request. After `split-reload-error-action` split `REQUEST_ERROR` (HTTP failures) from `RELOAD_ERROR` (file reload failures), this field is exclusively fed by `REQUEST_ERROR` — reload failures now flow to `transientError`. The field is written in 7 reducer cases (`SEND_REQUEST`, `RECEIVE_RESPONSE`, `REQUEST_ERROR`, `RELOAD_FILE`, `LOAD_FILE`, `SWITCH_ENV`, `createInitialState`) and read once (`src/app.tsx:678`, passed to `ResponseView`).

`AppState` already names every other error field by source: `transientError`, `fileLoadError`, `saveError`, `envSelectError`. The bare `error` is the outlier.

## Goals / Non-Goals

**Goals:**
- Rename `AppState.error` → `requestError`, matching the `REQUEST_ERROR` action and the `*Error` sibling naming convention.
- Update all write sites (7 reducer cases), the read site (app.tsx), and test literals/assertions.
- Update the one Requirement-level field reference in `tui/spec.md` ("File reload error display") and the narrative `` `error` `` reference in the File Reload section.
- Preserve all behavior — a pure rename.

**Non-Goals:**
- Renaming the `ResponseView` `error` prop (component's public interface; consistent with `FileLoadOverlay`/`SaveOverlay`/`EnvSelectOverlay`, which all receive a generic `error` prop from qualified state fields).
- Renaming the `error` payload field of `REQUEST_ERROR`/`RELOAD_ERROR` actions.
- Renaming any action names (`REQUEST_ERROR`, `RELOAD_ERROR`, etc.).
- Changing reducer behavior, rendering, or any observable behavior.

## Decisions

### Decision 1: Field name is `requestError`

The name mirrors the `REQUEST_ERROR` action that sets it and reads naturally in tests (`result.requestError`). Alternatives considered:

| Name | Verdict |
|---|---|
| `requestError` | ✅ Chosen — matches action name + `*Error` sibling pattern |
| `responseError` | ❌ The request failed; non-2xx responses are valid, not errors |
| `httpError` | ❌ Collides with "HTTP error" = 4xx/5xx mental model |
| `lastRequestError` | ❌ Verbose, breaks the one-word `*Error` pattern |

### Decision 2: `ResponseView`'s `error` prop is NOT renamed

Precedent in the codebase: qualified state fields feed generic component props.

```
fileLoadError  → <FileLoadOverlay error={state.fileLoadError} />
saveError      → <SaveOverlay      error={state.saveError} />
envSelectError → <EnvSelectOverlay error={state.envSelectError} />
error          → <ResponseView     error={state.error} />   →   error → <ResponseView error={state.requestError} />
```

The prop is the component's public interface and is referenced by `response-view/spec.md` scenarios. Renaming it would be inconsistent with the overlay pattern and would drag `response-view/spec.md` into the change.

### Decision 3: `tui/spec.md` gets a MODIFIED delta plus a narrative fix

The Requirement "File reload error display" (line 141-142) contains "error state" — updated to "request error state" via a MODIFIED delta. The narrative bullet "Reload clears `response`, `error`, and `responseScrollOffset`" (line 84) is prose outside any Requirement block, so the delta mechanism cannot express it; it is updated manually during the spec sync step of implementation.

### Decision 4: Mechanical rename via AST-grep, then targeted verification

The rename surface is fully enumerated (7 reducer sites, 1 app.tsx site, 7 test sites). `action.error` payload accesses in the reducer (`transientError: action.error.message`, `fileLoadError: action.error`, etc.) are action-payload reads, NOT the state field — they must not be renamed. AST-grep patterns target only `error:` object-literal keys in `AppState` contexts and `state.error` accesses; LSP diagnostics + the test suite confirm nothing is missed.

## Risks / Trade-offs

- **[Risk] Mechanical rename catches look-alikes** → The reducer contains `error: action.error` (state write) adjacent to `transientError: action.error.message`, `fileLoadError: action.error`, etc. (action-payload reads). Mitigation: enumerate every site in tasks.md and use targeted AST-grep patterns, then rely on `tsc` + tests to catch misses.
- **[Risk] Test literals that are `ResponseView` props, not state** → `test/components/ResponseView.test.tsx:15` uses `error: null` as a component prop (stays). Mitigation: tasks enumerate only the state-literal sites (`file-load-operations.test.ts`, `env-switcher.test.ts`, `reload-error.test.ts`).
- **[Trade-off] Narrative spec prose requires manual sync** → Line 84's `` `error` `` is outside the delta mechanism; it is fixed during the spec-sync task. Low risk: one line, explicitly listed.
- **[Trade-off] Spec delta is MODIFIED with no behavior change** → The requirement text changes only a field reference; scenarios are byte-identical. This is the correct delta shape for a rename that keeps the delta contract with the main spec.
