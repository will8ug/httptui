## Context

The `component-tests` main spec was created by `add-response-rendering-tests` (archived 2026-07-17) to codify the behaviors pinned by the new `test/components/*.test.tsx` files. It holds 33 scenarios across 3 requirements (`ResponseView`, `RequestDetailsView`, `StatusBar` component tests).

Two problems surfaced on review:

1. **Process-shaped framing.** Its Requirements mandate that "the test suite SHALL include" named test files with prescribed patterns. This is the same smell as the `testing` spec deleted in `1af0b01` ("Delete a spec purely for testing"), whose scenarios mandated directory layout, test tiers, and helper imports. The project's spec-hygiene history (`36d03f0` SOLID refactor, `8fad1a7` eslint-config removal, `7b23236` system-ca merge, `56093c1` duplication trim) settled the convention: specs describe **system behavior/capabilities**; test infrastructure is self-documenting in the repo.
2. **Massive duplication.** ~22 of the 33 scenarios re-assert behavior already mandated by other specs: search markers/bar (`response-search`), wrap/nowrap rendering (`text-wrap`), horizontal-offset rendering (`navigation`), details-panel display/scroll (`request-details`), shortcut bar (`shortcuts`), env-name indicator (`runtime-environment-switching`), INSECURE indicator (`executor` → "Insecure mode warning in status bar").

The remaining ~11 scenarios are genuine spec gaps with no requirement-level home (only `tui` freeform mentions): response-panel loading/error/empty states, pretty-print vs raw body display, verbose header display, render-level vertical slicing, per-panel status-bar text, transient status message, and formdata rendering in the details panel.

## Goals / Non-Goals

**Goals:**
- Every surviving scenario is written as observable system behavior (WHEN rendered with X THEN frame contains Y), never as a mandate on test files, test patterns, or test organization.
- Each behavior lives in exactly one spec — its capability home — eliminating the two-spec-update hazard.
- Zero code changes: `src/**` and `test/**` are untouched; the existing component tests remain and verify the newly spec'd behaviors.
- Record the lesson in a root `AGENTS.md` so future changes (human or agent) don't re-create process-shaped specs.

**Non-Goals:**
- No test deletions, additions, or refactors.
- No re-spec of behaviors already covered elsewhere (they are dropped, not moved).
- No changes to the raw-mode / verbose-mode toggle state machines (keys, actions, reducer) — only their *display* consequences gain a home here.
- No reorganization of any other specs.

## Decisions

### Decision 1: Distribute, don't re-home wholesale

**Choice:** Split `component-tests` content across two new capability specs (`response-view`, `status-bar`) and one modified spec (`request-details`), and drop the rest as duplicates.

**Rationale:** The project organizes main specs by user-facing capability (`response-search`, `text-wrap`, `request-details`, `fullscreen-panel`), not by component or by test tier. The unspec'd behaviors cluster naturally into two missing capabilities: response-panel rendering states and status-bar content.

**Alternatives considered:**
- *Keep `component-tests` but rewrite requirements as behavior*: rejected — the spec's organizing principle ("things component tests cover") is still test-shaped; its content overlaps three unrelated capabilities.
- *Fold everything into `tui`*: rejected — `tui` was deliberately trimmed (`56093c1`) to an overview with cross-references; detailed behavior belongs in focused specs.

### Decision 2: Full triage mapping

**Choice:** Apply this exact mapping (scenario → verdict → destination):

**ResponseView scenarios (15):**
- Loading spinner, error state, empty prompt, pretty-print default, raw bypass, verbose headers, vertical-scroll slicing → **move** to `response-view`
- Horizontal-offset shift, nowrap truncation → **drop** (duplicate of `navigation` → "ResponseView renders with horizontal offset")
- Wrap wrapping → **drop** (duplicate of `text-wrap` → "Wrap mode rendering in response panel")
- Search markers (`►`/`·`), search bar (3 scenarios) → **drop** (duplicate of `response-search` → "Arrow indicator on matching lines" / "Inline search bar display")

**RequestDetailsView scenarios (9):**
- Formdata fields rendered → **move** to `request-details` (MODIFIED display requirement — genuine gap)
- Title/request line, variable resolution, headers, body, empty-section omission, truncation, horizontal shift, vertical slicing → **drop** (duplicates of `request-details` display and scrolling requirements)

**StatusBar scenarios (9):**
- Per-panel status text (requests / details / response / response-without-response) → **move** to `status-bar`
- Transient message shown/hidden → **move** to `status-bar`
- Shortcut bar → **drop** (duplicate of `shortcuts` → "Status bar shows bar-visible shortcuts")
- Env name → **drop** (duplicate of `runtime-environment-switching` → "Active environment indicator in status bar")
- INSECURE indicator → **drop** (duplicate of `executor` → "Insecure mode warning in status bar")

**Rationale:** Verified against the current main specs by reading each candidate home; every "drop" verdict names the requirement that already covers the behavior.

### Decision 3: Behavior-only wording in the new specs

**Choice:** New requirements name components (`ResponseView`, `StatusBar`) and observable frame content, matching the established convention in `response-search` ("`ResponseView` SHALL render a `►` prefix…"). They never mention test files, test helpers, or assertion patterns.

**Rationale:** Naming components is already accepted in this repo's specs; mandating tests is what got `testing` deleted. The component tests verify these requirements but are not referenced by them.

**Alternatives considered:**
- *Keep a thin "component tests exist" requirement per component*: rejected — that's precisely the process-shaped framing this change eliminates.

### Decision 4: Record the lesson in `AGENTS.md`

**Choice:** Create a root `AGENTS.md` with a short "OpenSpec spec maintenance" section: maintain capability specs that describe system behavior; do not create specs for test infrastructure or mandate test files/patterns in specs; tooling and test layout are self-documenting in the repo; before adding a scenario, check whether an existing capability spec already mandates the behavior.

**Rationale:** The lesson was learned twice already (`testing` deleted 2026-06, `component-tests` flagged one month after creation). An agent-visible guardrail at repo root is the cheapest way to prevent a third round.

**Alternatives considered:**
- *Note in `openspec/` project docs only*: acceptable alternative, but root `AGENTS.md` is read by default by coding agents and discoverable by humans; the project currently has no `AGENTS.md` at all.

## Risks / Trade-offs

- **Future behavior change touches `test/components/` expectations but the spec now lives elsewhere** → Acceptable: spec-first workflow already requires updating the owning capability spec regardless of where tests live; the tests assert the spec'd strings (`Sending request`, `Press Enter to send a request`), so spec/test drift is caught by a red suite.
- **New `response-view` spec overlaps `text-wrap`/`navigation` edges (slicing, truncation)** → Mitigate by scoping `response-view` to content states and body/header display, and explicitly cross-referencing `navigation` (offsets) and `text-wrap` (wrap rendering) rather than restating them.
- **`status-bar` could become a gravity well for every indicator** → Acceptable: indicators already spec'd elsewhere (env name, INSECURE, shortcuts) stay in their homes; `status-bar` covers only what has no home (context status text, transient message).
- **Removing a main spec could lose information if a "duplicate" verdict is wrong** → Mitigate via the explicit per-scenario mapping in Decision 2; reviewable before apply, and git history retains the old spec.

## Migration Plan

1. Author delta specs: `response-view` (ADDED), `status-bar` (ADDED), `request-details` (MODIFIED), `component-tests` (REMOVED).
2. `openspec validate distribute-component-tests-spec --strict`.
3. Sync deltas to main specs: create the two new spec files, update `request-details`, delete `openspec/specs/component-tests/spec.md`.
4. Create root `AGENTS.md` with the spec-maintenance guidance.
5. Run `npm test` — entire suite (including `test/components/`) passes unchanged.
6. Archive the change.

Rollback: restore `openspec/specs/component-tests/spec.md` from git and delete the two new specs; no code rollback needed.

## Open Questions

- Should `AGENTS.md` grow into broader contributor guidance later (build/test commands, code style)? Out of scope here — this change seeds it with only the spec lesson; expand opportunistically.
