## Context

See proposal.md for motivation. Relevant current state:

- The save-as-.http flow (`S`) owns a dedicated mode (`saveLoad`) with state fields `saveInput`/`saveCursor`/`saveError`, a sub-reducer (`src/core/reducers/save-load.ts`), and the handler `handleSaveInput` in `src/app/input-handlers.ts`. Its `SAVE_FILE` action rebinds `state.filePath` and clears every request's `isDirty` marker — behavior that must NOT apply to saving a response.
- `SaveOverlay` (`src/components/SaveOverlay.tsx`) renders the path input with cursor inversion and inline error; its only save-as-specific content is the hardcoded title `Save as .http`.
- JSON detection exists exactly once, inline in `formatResponseBody` (`src/core/formatter.ts`): try `JSON.parse`, fall through on failure. The panel pretty-prints iff that parse succeeds.
- `state.response: ResponseData | null` holds the last received response; `body` is a UTF-8 string, CRLF-normalized at capture. It persists across selection changes.
- Lowercase `s` is unbound in normal mode (verified in `handleNormalInput`).
- File writes in this codebase are synchronous `writeFileSync` calls inside input handlers, not `commands.ts` (which is reserved for async work: network, clipboard, editor handoff).

## Goals / Non-Goals

**Goals:**

- A response-save flow indistinguishable in feel from the `S` save-as flow: same overlay, same editing keys, same conflict refusal, same error/success feedback.
- Zero behavior change to the existing save-as-http and in-place save flows.

**Non-Goals:**

- Extracting the line-editor block shared by the file-load/save/response-save handlers (pre-existing duplication; a refactor, not this change).
- Full HTTP dump mode, uniquified filenames, binary body preservation (proposal non-goals).

## Decisions

### D1: Dedicated `responseSave` mode instead of generalizing `saveLoad`

New mode `responseSave` with its own state fields (`responseSaveInput`, `responseSaveCursor`, `responseSaveError`), actions (`ENTER_RESPONSE_SAVE`, `UPDATE_RESPONSE_SAVE_INPUT`, `MOVE_RESPONSE_SAVE_CURSOR`, `SET_RESPONSE_SAVE_ERROR`, `SAVE_RESPONSE_FILE`, `CANCEL_RESPONSE_SAVE`), and sub-reducer `src/core/reducers/response-save.ts`.

- Why not a `saveKind` discriminator on `saveLoad`: `SAVE_FILE` rebinds `filePath` and clears `isDirty` markers — save-as semantics baked into the action. Branching on a discriminator inside that reducer couples two flows that differ in exactly those semantics and risks regressions in save-as-http.
- The codebase pattern is one mode per overlay with dedicated state slices (`fileLoad`, `saveLoad`, `envSelect`, …) — a parallel mode is consistent.

`SAVE_RESPONSE_FILE` returns to normal mode, clears the response-save fields, and sets the transient message. It does NOT touch `filePath` or any `isDirty` marker.

### D2: Reuse `SaveOverlay` with a `title` prop

Add a `title` prop to `SaveOverlay` (defaulting so the save-as flow renders identically — or pass `Save as .http` explicitly at the call site, whichever keeps the existing tests green). The response-save call site passes `Save response`. No new component; the input rendering, cursor inversion, and error line are shared.

- Alternative: a new `ResponseSaveOverlay` — duplicates a 48-line component for one string's difference.

### D3: JSON detection extracted from `formatter.ts`

Export a predicate (e.g. `isJsonBody(body): boolean`) from `src/core/formatter.ts` where the try-parse already lives, and have `formatResponseBody` use it or keep its inline parse — the requirement is a single source of truth for "the panel considers this JSON". The default-extension rule (`.json` vs `.txt`) uses that predicate, so a body is saved as `.json` exactly when the panel would pretty-print it.

### D4: Default filename as a pure helper

`deriveResponseSaveFilename(requestName: string, body: string): string` — sanitize each `/` in the name to `-`, append `.json` when `isJsonBody(body)`, else `.txt`. `ENTER_RESPONSE_SAVE` derives the default from `state.requests[state.selectedIndex].name` and `state.response.body` and places the cursor at the end. The parser always assigns a name (`Request N` for bare separators, per the in-place-save spec), so no empty-name fallback is needed.

- Why from the selected request: the user's requirement is `<request-name>`; the content/name mismatch when navigating after sending is spec'd as expected behavior (see save-response spec, "Saved content follows the displayed response, not the selection").

### D5: Mirror `handleSaveInput` in a new `handleResponseSaveInput`

Same structure as the existing handler: `Escape` cancels, `Enter` trims/validates/resolves (relative against `dirname(state.filePath)`), `existsSync` refusal, `writeFileSync(body, 'utf8')` of `state.response.body` verbatim, inline errors via `SET_RESPONSE_SAVE_ERROR`, then the line-editing block (home/end/backspace/delete/arrows/insert) mirroring the save handler's. The write stays synchronous in the handler per the existing pattern.

- The ~40-line line-editing block becomes a third copy (after `handleFileLoadInput` and `handleSaveInput`). Accepted: pattern-consistent, zero risk to existing flows; extraction is a standalone refactor if the team wants it later.

### D6: No-response guard at the binding site

`s` in `handleNormalInput`: if `state.response` is null, dispatch `SET_TRANSIENT_MESSAGE` with a "no response to save" message and return — same shape as the `E`-with-no-environments guard. Never enter the mode without a response, so `handleResponseSaveInput` can assume the body exists.

## Risks / Trade-offs

- [SaveOverlay signature change breaks save-as tests] → The prop is additive; the save-as call site passes the same `Save as .http` string, keeping rendered output byte-identical. Verify with the existing StatusBar/SaveOverlay-related tests before proceeding.
- [Exhaustive switches over `AppMode` or `Action` miss the new cases] → TypeScript's union exhaustiveness will surface them at build time; run the full build plus lint.
- [Content/name mismatch surprises users] → The transient success message names the written file, making what was saved visible; the behavior is spec'd deliberately rather than accidental.
- [Registry drift between help overlay, status bar, and README] → The shortcuts spec mandates the registry as single source; README row is a manual task item in tasks.md.

## Migration Plan

Additive only — no persisted state, no config, no file-format changes. Rollback is reverting the commit.
