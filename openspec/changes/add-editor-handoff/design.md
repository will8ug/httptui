## Context

See proposal.md — Why. Constraints that shape the approach:

- **The parser is lossy.** `ParsedRequest` carries no comment field, and `serializeHttpFile` emits only `### name`, the request line, headers, and body. Round-tripping the whole file through the in-memory model would silently delete comments and normalise formatting. This is why in-place save does surgical block replacement rather than a full rewrite.
- **Ink owns the render loop and raw mode.** A child process cannot share the terminal with a live Ink render. The pinned Ink version provides `suspendTerminal()`, an API added specifically for handing the terminal to a child process; it flushes the frame, restores terminal modes, and forces a full repaint on resume.
- **`cli.tsx` manages the alternate screen by hand**, writing `\u001B[?1049h` before `render()` and `\u001B[?1049l` from a `finally` handler. Ink is not told about it, so Ink cannot release it.
- **The discard-confirm machinery is already generic.** The reducer stores a pending action and flips mode; `app.tsx` performs the side effect after confirmation. Adding a fourth action needs no reducer change.
- **Failed reloads already preserve state.** `RELOAD_ERROR` sets a transient error and touches nothing else — a deliberate decision recorded in the archived `split-reload-error-action`.

## Goals / Non-Goals

**Goals:**

- Reuse the existing reload path so the handoff introduces no second notion of "load a file".
- Keep the source file the single source of truth during the handoff; the app holds no shadow copy.
- Make every failure mode non-destructive: no path through this feature may leave the user with fewer requests than they started with.
- Confine terminal manipulation to the framework rather than hand-rolled escape sequences.

**Non-Goals:**

- Re-parsing or validating the file while the editor is open. The app is passive until the editor exits.
- Merging external edits with uncommitted in-memory edits. The confirmation prompt makes this an either/or choice.
- Detecting *what* changed in the file. Change detection is a single yes/no.
- Interactive recovery from a bad edit (an offer to re-open the editor). See Open Questions.

## Decisions

### 1. Hand over the real file, not a temp copy

The editor is launched on `state.filePath` directly.

*Alternatives considered.* Serialising the in-memory requests to a temp file and copying back would let the editor see uncommitted edits and would allow validation before touching the user's file. Rejected: serialisation destroys comments and formatting, so a user who opened the editor to fix a typo would find their annotations gone. It would also need a write-back path duplicating in-place-save's guards. Editing the real file preserves every byte the user did not touch, at the cost of leaving a broken file on disk if the user writes one — no worse than editing in another terminal, and the parse error is surfaced immediately.

Because the file on disk lacks uncommitted edits, the handoff must be gated by the unsaved-changes prompt; that is the price of this decision and the reason for Decision 5.

### 2. Use the framework's terminal suspension, and give it the alternate screen

The handoff wraps the child process in Ink's `suspendTerminal()`. Ink then exits the alternate screen, shows the cursor, disables bracketed paste, leaves raw mode, detaches its stdin listener, runs the callback, and on return re-enters the alternate screen, restores input, and repaints the whole frame instead of diffing against a frame the editor may have overwritten.

This only works if Ink knows it owns the alternate screen, which today it does not. So `cli.tsx` moves from manual escape-sequence writes to Ink's `alternateScreen` render option, and the manual writes and the `finally` restore handler are removed.

The migration is safe with respect to startup errors: the "no requests found" exit and the file-read errors all occur before the alternate screen is currently entered, so moving entry into `render()` does not change which errors print to the normal screen.

*Alternatives considered.* Keeping manual management and bracketing the spawn with our own `?1049l` / `?1049h` writes. Rejected: it splits ownership of the alternate screen between `cli.tsx` and the handoff code, and we would still have to hand-roll raw-mode teardown, cursor restore, and the forced repaint that Ink already does correctly.

### 3. Launch the child asynchronously, inheriting stdio

The editor is spawned with inherited stdio so it takes the terminal directly, and awaited via its exit event rather than run synchronously. Synchronous child-process calls can keep the platform's console input active after the parent releases stdin, racing terminal editors on Windows.

The resolved editor value is split on whitespace before spawning: the first token becomes the executable, the remaining tokens are passed as arguments ahead of the file path, and no shell sits in between. Editor values routinely carry flags — a GUI editor blocks until closed only when given a wait flag (`code --wait`) — and passing the whole value as one executable fails with `ENOENT`. Splitting and exec'ing directly is the modern convention (`kubectl edit`, gemini-cli); the classic tools (git, `crontab -e`) instead hand the whole string to `sh -c`, which we reject because a shell turns the file path and the user's value into injection surface. The trade-off is that an editor path containing spaces cannot be expressed — kubectl punts to a shell for quoted values; deferring that escape hatch until someone asks for it.

### 4. Modification time is the only trigger; the exit status is ignored

On return the recorded pre-launch modification timestamp is compared with the current one. Unchanged means no reload at all. Changed means reload.

The editor's exit status is deliberately not consulted. `visudo` sets the precedent explicitly, ignoring the editor's exit value because terminal editors do not agree on what a non-zero exit means — `vim`'s `:cq` returns non-zero after a successful save, while an editor can exit zero having written nothing. Deriving the outcome from the file's own state avoids the ambiguity entirely.

A failure to *launch* is different in kind and is reported as an error: nothing ran, so nothing about the session should change.

*Trade-off.* Saving without editing bumps the timestamp and causes a redundant reload. That reload is harmless — identical content parses to equivalent requests and the selection is preserved by name — and the alternative, hashing file contents, buys nothing for the case that matters (opening the editor and quitting).

### 5. Reuse the discard-confirm machinery as a fourth pending action

`PendingDiscardAction` gains a variant; `ConfirmDiscardOverlay` gains a branch describing it; `app.tsx` gains a normal-mode branch and a matching arm in the post-confirmation switch. The reducer is untouched. The overlay's action-description switch has no `default` clause, so the compiler flags the missing branch.

Gate order is format-check first, then dirty-check. A source that cannot be handed off at all should say so rather than first asking the user to discard their work.

### 6. Failure outcomes preserve state, and each is distinguishable

| Outcome | Effect |
|---|---|
| Format not http | Transient message. No prompt, no launch. |
| Editor fails to launch | Transient error. Nothing else changes. |
| File unmodified | Nothing at all — no reload, no message. |
| Parses, has requests | Normal reload, "Reloaded" confirmation. |
| Parses, zero requests | Transient message, previous requests kept. |
| Unparseable | Existing reload-error path: transient error, everything preserved. |

The unparseable case needs no new code — it dispatches the existing reload-error action. The zero-request case mirrors the refusal the file-load overlay already applies, and keeps the app out of an empty-request state, which is reachable today only via `R` and is not otherwise well-defined.

### 7. Make the editor invocation substitutable for tests

Spawning a real editor in the test suite is not viable, so the component that resolves and launches the editor is written to be replaceable — either by injecting the launcher or by pointing the environment variable at a scriptable command that mutates the file and exits. Tests then cover the decision table above by controlling what the fake editor does to the file and whether it exists at all.

*Alternative considered.* Testing only the reducer and leaving the spawn untested. Rejected: the interesting behaviour of this feature is precisely the outcome matrix on return, and that logic lives around the spawn, not in the reducer.

## Risks / Trade-offs

- **The alternate-screen migration touches app startup and shutdown** → It is a small, self-contained change made before the feature is wired up, and it is verifiable independently: launch and quit must leave the scrollback intact exactly as they do today.
- **A user writes a broken file and loses their in-memory edits** → They must pass the discard prompt first, so the loss is consented to. The broken file's contents are still on disk and still in their editor's undo history; the app reports the parse error and keeps showing the previously loaded requests.
- **Timestamp granularity could miss an edit saved within the same clock tick as the launch** → Requires a sub-millisecond edit-and-save by a human; the millisecond-resolution timestamp makes this effectively unreachable.
- **A configured editor that does not take over the terminal** (a GUI editor configured without its wait flag) **appears to do nothing** → The file is unmodified, so the handoff is a silent no-op, matching the "quit without saving" behaviour. Documenting that the editor must block until closed is a docs concern, not a code one.
- **Non-interactive environments** (no TTY) → The suspension API is a no-op outside an interactive terminal and the callback still runs; the feature is only reachable from an interactive TUI session in the first place.
- **An adjacent latent bug is left in place**: with zero requests loaded, the selection-index clamp collapses to an invalid index and the selection sticks. This change cannot reach that state because it refuses zero-request reloads, but `R` still can. Deliberately out of scope; a follow-up should add the same refusal to `R` and fix the clamp, so the fix closes the route rather than patching the symptom.

## Open Questions

- Whether to offer an interactive retry after a failed parse — re-opening the editor with the error shown, as `crontab -e` and `kubectl edit` do — instead of only reporting the error. This is additive: it would introduce a new prompt without altering any outcome specified here, so it can be decided after the basic handoff is in use.
