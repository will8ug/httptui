## Context

httptui's architecture is unusually constrained, and those constraints drive nearly every decision below.

- **One input handler.** `src/app.tsx` line 138 holds the only `useInput` in `src/`. Every component — including all four existing overlays — is a pure renderer with no local state and no input handling.
- **One pure reducer.** `src/core/reducer.ts` owns all state transitions. Side effects (file I/O, HTTP, `setTimeout`) live in `app.tsx` around the dispatch calls.
- **Requests are immutable.** No action mutates an individual `ParsedRequest`. `RELOAD_FILE` and `LOAD_FILE` replace `state.requests` wholesale. This change introduces the first per-request mutation.
- **Placeholders are resolved late.** `ParsedRequest.body` stores raw text with `{{var}}` intact; `resolveVariables()` is applied at send time and at display time. `RequestDetailsView` is spec'd to show the **resolved** body.
- **Serialization already exists.** `serializeHttpFile(requests, fileVariables)` produces `.http` text from in-memory state and is spec'd to round-trip through `parseHttpFile`. It is invoked by `S`, which writes to a **new** file and never overwrites.
- **The parser is lossy.** `parseHttpFile` discards comments, blank-line layout, and `HTTP/1.1` suffixes.
- **Coverage is published.** `README.md` renders coverage badges from `vitest run --coverage`. Unreachable branches are a visible cost.

Three text inputs already exist (`fileLoadInput`, `searchQuery`, `saveInput`). All three follow the same shape: state holds a string, `key.backspace` slices, printable `input` appends, the overlay renders `value` plus a bold `_`. None of them supports a cursor or newlines.

## Goals / Non-Goals

**Goals:**

- Edit the selected request's body inside the TUI, operating on **raw** text with `{{var}}` placeholders preserved.
- A committed edit updates in-memory state so it is used by the request-details panel, by send, and by `S` export — with **zero new persistence code**.
- Preserve all three architectural invariants: one `useInput`, pure reducer, display-only components.
- Add no runtime dependencies.
- Fix the extension seam for URL and header editing now, **without introducing unreachable code**.
- Make unsaved work visible and hard to lose by accident.

**Non-Goals:**

- Writing edits back to the source file in place. The parser is lossy; an in-place write would silently delete user comments. In-place saving requires a lossless parser first, which is a separate and larger change.
- URL editing, header editing, and the tab strip that would select between targets.
- Undo/redo, `$EDITOR` handoff, bracketed-paste via `usePaste`, and grapheme-correct handling of CJK/emoji column widths.
- An edit → send → observe → edit loop. Confirmed out of scope, which is what makes the overlay presentation viable.

## Decisions

### Decision 1: Flat offset buffer, not a line/column model

The editor state is `{ text: string; cursor: number }` where `cursor` is a character offset into `text`. Lines are purely a rendering concern (`text.split('\n')`).

Every mutation is a slice-and-splice, and **`Enter` is the same code path as any printable character** — it inserts `'\n'`. Vertical movement is the only operation needing line awareness, handled by two pure conversions:

```
offsetToLineCol(text, offset) -> { line, col }
lineColToOffset(text, line, col) -> offset      // line and col both clamped
```

*Alternative considered — `{ lines: string[]; cursorLine; cursorCol }`.* Rejected: it makes every mutation a two-level index update, requires explicit joining at every boundary (backspace at column 0 merges lines, newline splits one), and makes `text` a derived value that must be recomputed on each commit. The flat model keeps `text` primary, which is exactly what `ParsedRequest.body` needs.

*Alternative considered — omitting `↑`/`↓` entirely ("Left/Right only").* Rejected on usability grounds: a 25-line JSON body is roughly 600 characters, so reaching the last line would require ~600 `←` presses. The two conversion helpers above are approximately fifteen lines of pure code, so the "simplification" costs far more than it saves.

### Decision 2: `Enter` inserts a newline; `Ctrl+S` commits

The three existing text inputs bind `Enter` to confirm, but they are single-line paths where that is correct. A body editor that cannot insert a newline cannot express a formatted JSON payload, which is the primary use case.

There is a second, independent reason. Ink delivers a multi-character paste as a single `input` string, and terminals transmit embedded newlines within a paste as `\r`, which surfaces as `key.return`. With `Enter` bound to confirm, pasting a multi-line body would submit the overlay mid-paste. With `Enter` bound to newline, the same paste lands correctly.

`key.return` must therefore be handled **before** the printable-character branch, so the raw `\r` is never inserted verbatim.

### Decision 3: Overlay presentation, reusing the existing pattern

The editor renders through `Layout`'s existing `overlay` prop, alongside `HelpOverlay`, `FileLoadOverlay`, `SaveOverlay`, and `EnvSelectOverlay`. No new `Layout` slot, no new `FocusedPanel` member, no change to the `Tab` cycle.

*Alternative considered — a fourth panel in the right column, or a new maximized-panel target.* Both were rejected because their only real advantage is keeping the response visible while editing, and that loop is an explicit non-goal. Either would also force churn on `FocusedPanel`, the `Tab` cycle spec, and the `Layout` component.

The overlay is sized wider and taller than the existing ones — bodies need room. It occupies most of the content area rather than the compact 48–72 column box that `SaveOverlay` uses.

### Decision 4: `mode: 'edit'` plus `editTarget`, with a single-member `EditTarget`

```ts
export type EditTarget = 'body';
export type AppMode = 'normal' | 'fileLoad' | 'search' | 'envSelect' | 'saveLoad' | 'edit' | 'confirmDiscard';
```

The **shape** of the state machine is fixed permanently: `ENTER_EDIT` carries a `target`, and `AppState.editTarget` records it. Adding URL editing later widens `EditTarget` to `'body' | 'url'` — a one-line type change with no restructuring.

Declaring all three members now would create switch branches that no input can reach, which is dead code against published coverage badges. A single-member union is an honest seam: the contract is fixed, and nothing unreachable exists.

The tab strip that selects between targets is deliberately **not** built in this change. It is pure rendering, it costs nothing to add later, and building visible tabs where two of three do nothing is scaffolding for its own sake.

### Decision 5: Cursor-following viewport, reusing `clampScrollOffsetToCursor`

`src/core/reducer.ts` already exports:

```ts
clampScrollOffsetToCursor(selectedIndex: number, currentOffset: number, visibleCount: number): number
```

It is used by `MOVE_SELECTION` and `ENTER_ENV_SELECT`. The same function serves both editor axes: pass the cursor's line for `editScrollOffset`, and the cursor's visual column for `editHorizontalOffset`.

The reducer does not know terminal dimensions, so — exactly as the existing `SCROLL` action does with its `maxOffset` payload — `app.tsx` computes the editor's `visibleHeight` and `visibleWidth` and passes them on every edit action. Reducer stays pure.

This clamping applies on **entry** as well as on every keystroke. Because the cursor is seeded at the end of the buffer (matching the save overlay's convention), a buffer taller than the overlay would otherwise open scrolled to the top with the cursor off-screen. `ENTER_EDIT` therefore also carries `visibleHeight`/`visibleWidth` and clamps from 0. "The cursor is always within the visible slice" has no exception for the first frame.

Horizontal scrolling (rather than soft-wrapping) is chosen for consistency with `RequestDetailsView`, and because soft-wrap would require mapping the cursor offset onto wrapped visual lines.

### Decision 6: Tab characters are expanded for display only

`expandTabs(line, 8)` already exists and is used by `RequestDetailsView`. The editor renders expanded text, and computes the cursor's **visual** column as `expandTabs(line.slice(0, col)).length`.

Insertion and deletion operate on raw offsets and are unaffected by expansion, so display and editing stay consistent. This is why tab expansion is safe here even though it changes column widths.

### Decision 7: Commit normalizes an empty buffer to `undefined`

`ParsedRequest.body` is `string | undefined`, and `serializeHttpFile` and the executor both branch on `undefined`. Committing an empty buffer therefore stores `undefined`, not `''`.

The dirty flag is set only when the committed value actually differs from the previous value, so opening the editor and committing without changes does not mark the file dirty.

### Decision 8: Form-data requests are blocked at entry

A `ParsedRequest` carrying `formdataFields` has `body: undefined`, and `serializeHttpFile` emits form-data as a comment rather than a real body — it is not representable in `.http`. Pressing `e` on such a request sets a transient message and does not enter edit mode.

*Alternative considered — allow editing and drop the form-data fields.* Rejected as silent data loss.

### Decision 9: Discard guards fire at key press, not at commit point

Pressing `R`, `o`, or `q` while dirty transitions to `mode: 'confirmDiscard'` and records which action was intercepted:

```ts
export type PendingDiscardAction = 'reload' | 'fileLoad' | 'quit';
```

Confirming dispatches `CONFIRM_DISCARD` (clears the dirty flag, returns to normal mode) and then `app.tsx` performs the recorded side effect. Declining returns to normal mode and does nothing.

*Alternative considered — guarding `o` at its commit point (after the path is validated and parsed) rather than at key press.* That is marginally better UX, since a user who opens the file overlay and then cancels is never prompted. It was rejected because it requires stashing an entire parsed `ParseResult` payload in `AppState` while the confirmation is pending, and it makes the three guards asymmetric. Guarding at key press keeps all three uniform and payload-free. The cost is a spurious prompt when the user opens and then abandons the file overlay — an annoyance, not data loss.

`Ctrl+C` bypasses the guard entirely and exits immediately, per terminal convention.

### Decision 10: `Escape` in the editor discards without confirming

Consistent with all four existing overlays, where `Escape` cancels. The scope of the loss is one field's in-progress edit, not the whole session's work, so a second confirmation layer is not warranted at this size.

This is a deliberate asymmetry with Decision 9: the discard guard protects **committed** edits that have never reached disk; `Escape` discards an **uncommitted** buffer.

### Decision 11: The dirty marker prefixes the file name and clears on any successful save

`getStatusText` in `StatusBar.tsx` already builds `{fileName} | {context}`. When dirty, the file name is prefixed with `*`, following the convention used by text editors.

`SAVE_FILE` clears the flag. Note the consequence: because `S` never overwrites and auto-suffixes on conflict, saving an edited `api.http` writes `api - 1.http` and clears the marker even though `api.http` on disk is unchanged. This is the accepted semantics — the edits have been persisted somewhere, and `S` is explicitly a save-*as* command.

`RELOAD_FILE` and `LOAD_FILE` also clear the flag, since both replace state with content freshly read from disk.

## Risks / Trade-offs

- **Multi-character paste containing newlines may behave inconsistently across terminals.** Ink delivers bracketed pastes as one `input` chunk when the terminal supports it, and character-by-character otherwise. → Mitigated by Decision 2: because `Enter` inserts a newline and printable input is inserted at the cursor, both delivery modes produce correct text. Adopting Ink 7's `usePaste` would be more robust but would add the codebase's second input hook, so it is deferred.
- **`key.delete` support varies by terminal.** Ink 7 distinguishes backspace from delete, but older terminal profiles conflate them. → `Backspace` is the primary deletion key and is already proven by three existing overlays; forward-delete is an additive convenience whose absence does not block editing.
- **Wide characters (CJK, emoji) will misplace the cursor**, because column math uses string length rather than display width. → Accepted for a first version; request bodies are overwhelmingly ASCII JSON. `RequestDetailsView` has the same limitation today, so this introduces no new inconsistency.
- **First per-request mutation in the codebase.** Anything that assumed `state.requests` is reference-stable after load could break. → `COMMIT_EDIT` replaces the array immutably (new array, new object at the edited index), matching React and reducer conventions; the existing `RELOAD_FILE`/`LOAD_FILE` cases already replace the array wholesale, so consumers cannot have depended on identity.
- **Two new modes expand the `useInput` cascade** in an already long handler. → Both new branches follow the existing early-`return` structure exactly, and both are placed alongside the other mode branches before the normal-mode keys.
- **Spurious discard prompt when abandoning the file-load overlay.** → Accepted trade-off, documented in Decision 9.
- **`e` collides with nothing today**, but the normal-mode keyspace is filling up. Currently bound: `q ? Tab v w r d f o E S / n N R Enter g G 0 $ h j k l`, arrows, and `Escape`. → `e` and `i` are both free; `e` is taken here, leaving `i` available.
