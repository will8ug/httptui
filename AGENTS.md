# AGENTS.md

Guidance for coding agents (and humans) working in this repository.

## Planning workflow

Non-trivial work runs through the skills pipeline: grill (or grill-with-docs) → to-spec → to-tickets → implement. `to-tickets` publishes to the local-markdown tracker under `.scratch/` — gitignored by design; tickets are working state, never commit them. Tracker conventions: `docs/agents/issue-tracker.md`; the `## Agent skills` section at the end of this file holds the scaffold pointers.

Durable knowledge has one home per concern: domain vocabulary and the capability map in `CONTEXT.md`, decisions in `docs/adr/`, coding conventions in this file, and behavior contracts pinned by the test suite (fastest tier that can verify — see Testing pyramid below).

## Commit cadence

Commit one ticket at a time, as each ticket resolves. Dependency order does the serialization: a ticket commits before the tickets that need it branch off.

- Parallel tickets run in separate git worktrees, each committing its own branch; merge them back into the primary tree one ticket per merge, so each worktree commits only its own work.
- A fresh worktree has no `node_modules` — copy it in (or install) before running tests there.
- Ticket bookkeeping (`.scratch/`) stays in the primary tree; agents working in a worktree report back and the tracker is updated centrally.

Precedent: the per-ticket branch merges in history (`ck-06-render`, `ck-08-clearsearch`, `is-03-format`) — one ticket per merge, merged as work progressed rather than squashed at the end of a feature.

## Comments

Prefer self-documenting code over comments. A comment earns its place by supplying a contract, gotcha, or reason that is not clear from the code at that point.

- **Self-document first.** Use meaningful function and variable names for phases and invariants. In tests, use descriptive names and named constants for fixture geometry or expected offsets instead of comments that narrate arithmetic or arrange/assert steps.
- **Document contracts once, at their owner.** Public callback timing and lifecycle, chunk-boundary rules, units, and reconstruction guarantees belong on the owning type or function. Prefer one concise sentence per guarantee; use more only when the contract requires it. Call-site comments should add only a local constraint, not repeat the owner's documentation.
- **Explain why, not what.** Keep race hazards, ADR-backed configuration rationale, and design decisions that look incorrect or surprising without context. Let conditionals, method calls, test names, and assertions describe behavior themselves; a comment about a guard should explain the hidden hazard, such as a late callback replacing a completed response.
- **Explain current state, not change history.** Comments like `// After recursive-body-synthesis, ...` are git-history noise. The commit message already captures what changed.

Precedent: the `recursive-body-synthesis` and streaming-response cleanups removed restating comments and condensed verbose docstrings while retaining concise API contracts, race warnings, and design rationale.

## Shortcut documentation

The shortcut list in `docs/keyboard-shortcuts.md` and the help overlay are deliberately different in wording and coverage. Do not align them entry-for-entry.

- **`docs/keyboard-shortcuts.md` is the verbose reference.** Descriptions may qualify behavior per table (e.g. `q` — "Dismiss search results when shown, otherwise quit application"), and tables may repeat a key in another context's table (e.g. `Escape` and `q` in the Search table) when it clarifies that context.
- **The help overlay is the terse cheat-sheet.** Labels stay short (`q` — "Quit application"); slightly less precise is acceptable, factually wrong is not. It renders from the `SHORTCUTS` registry (`src/core/shortcuts.ts`), as does the status bar's `[q] Quit` — the literal texts are pinned by tests (`test/core/shortcuts.test.ts`, `test/components/HelpOverlay.test.tsx`).
- **Change the shortcut reference, not the registry, when a key gains a qualifier.** Touching the registry cascades into the overlay, the status bar, and their tests for no user-visible benefit.

Precedent: the `scope-quit-key` change documented `q`'s search-dismissal step and `Escape`'s dismissal role across both shortcut tables while leaving the `SHORTCUTS` registry and help overlay untouched — all three text-coupled tests stayed green unmodified.

## Testing pyramid

Prefer the fastest tier that can verify a behavior. Integration tests are for what only they can verify — write one only when no unit tier can.

- **Unit-testable behavior lives at unit tiers.** Input-handler dispatch assertions go in `test/app/*-input.test.ts` (call `handleNormalInput`/`handleXxxInput` directly with a dispatch-capture array — no Ink render, no `press()` delays), reducer transitions in `test/core/reducers/`, single-component rendering in `test/components/`. When a function CAN be covered by one of these tiers, cover it there — do not render the full app to assert it.
- **Integration tests are reserved for what demands the full render stack:** real fs/subprocess roundtrips, App-level `useEffect` timer semantics (e.g. the `TRANSIENT_CLEAR_MS` window), executor↔reducer race coordination (e.g. late-response discard), and cross-capability wiring invariants that no single unit tier pins (e.g. state → `Layout` → component chains).
- **Never drop a verifier without naming its replacement.** Before deleting or skipping an integration test, point at the unit/component test that covers the same observable behavior — every pinned behavior keeps a verifier at some tier. Handler/reducer/component coverage counts; render-level duplication does not.

Precedent: the pyramid refactor (`5abe292`, `738247d`) pruned ~175 integration tests while adding handler/reducer/component coverage for every behavior they pinned, leaving `test/integration/` with only genuine end-to-end concerns (subprocess roundtrips, fs writes, timer semantics, cross-capability invariants).

## Test directory layout

Two test-adjacent directories exist with distinct purposes; do not blur them.

- **`test/utils/`** houses unit tests for `src/utils/` modules — every file is `*.test.ts` and corresponds to a `src/utils/*.ts` source. Do not drop non-test helpers here.
- **`test/helpers/`** houses shared test infrastructure consumed across test files — data factories (`createRequest`/`createMockResponse`/`createInitialState`), app renderers (`integration.tsx`), and assertion/type-guard helpers (`assertions.ts`). It is the catch-all for "stuff tests need to share but isn't itself a test."

Precedent: the `assertDefinedToNarrowType` helper was first placed in `test/utils/` (introducing the first non-test file in a directory of `*.test.ts` files mirroring `src/utils/`), then moved to `test/helpers/` to preserve the `test/utils/` ↔ `src/utils/` symmetry.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/` (gitignored). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the repo root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.
