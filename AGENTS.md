# AGENTS.md

Guidance for coding agents (and humans) working in this repository.

## OpenSpec spec maintenance

Main specs (`openspec/specs/`) describe **system capabilities and observable behavior** — nothing else.

- **Maintain capability specs.** Each spec covers a user-facing capability (`response-search`, `text-wrap`, `request-details`, …). Requirements state what the system SHALL do; scenarios state observable outcomes (WHEN/THEN).
- **No process-shaped framing.** Never create specs for test infrastructure, and never mandate test files, test patterns, directory layouts, or helper imports in a spec. "The test suite SHALL include `test/components/X.test.tsx`" is a smell — tests verify spec'd behavior, but specs do not prescribe tests.
- **Tooling and test infrastructure are self-documenting** in the repo (config files, TypeScript types, existing test files). Do not duplicate them into specs.
- **Before adding a scenario, check for an existing home.** If another capability spec already mandates the behavior, do not restate it — cross-reference instead. Duplicated behavior across specs means every change needs two spec updates.

Precedent: the `testing` spec was deleted for being purely process-shaped (`1af0b01`), the `eslint-config` spec was removed as self-documenting tooling (`8fad1a7`), and `component-tests` was distributed into capability specs (`response-view`, `status-bar`, `request-details`) by the `distribute-component-tests-spec` change.

## Comments

Prefer self-documenting code over comments. Only add comments for knowledge that cannot be expressed in the code itself.

- **Self-document first.** Use clear test names, descriptive assertion values, and meaningful function names. A switch statement or an `expect().toBe(...)` is already its own documentation.
- **Never restate what the code says.** If a comment describes what the next line does, the code already says that — remove the comment.
- **Never reference change history.** Comments like `// After recursive-body-synthesis, ...` are git-history noise. The commit message already captures what changed. Explain the *current state*, not the transition.
- **Reserve comments for non-obvious knowledge only:** gotchas that look correct but aren't (e.g., an em-dash resembling a hyphen), design decisions not evident from the code (e.g., bracket-notation encoding), and contract invariants a maintainer might unknowingly violate (e.g., "assumes document is already dereferenced").
- **Keep docstrings short.** If a docstring exceeds 5 lines, it is likely restating the function body. Trim to the contract and non-obvious behaviors.

Precedent: 9 restating comments and 3 verbose docstrings were cleaned up in the `recursive-body-synthesis` change, keeping only gotcha warnings and contract notes.

## Design-goal consistency

When a design decision contradicts a stated goal, resolve the contradiction before implementing — do not silently pick one side.

- **Audit existing behavior before generalizing.** When replacing a feature with a more general one, enumerate every behavior of the old implementation — including edge cases like type-name placeholders — and decide explicitly whether each is preserved or dropped.
- **Pseudocode is authoritative.** Implementation agents follow pseudocode literally. If the pseudocode contradicts the prose goals, the pseudocode wins — so the pseudocode must be consistent with the goals.
- **Flag contradictions, don't resolve them silently.** A design doc that says "preserve existing behavior" in Goals but "do not do X" in Decisions is a bug in the design. Fix the design before implementing.

Precedent: the `recursive-body-synthesis` design said "preserve all existing test behavior" and "fall back to the type name" in Goals, but Decision 1's pseudocode said "DO NOT return the type name." The implementation followed the pseudocode, dropping the type-name placeholder — a regression caught post-ship.

## Test directory layout

Two test-adjacent directories exist with distinct purposes; do not blur them.

- **`test/utils/`** houses unit tests for `src/utils/` modules — every file is `*.test.ts` and corresponds to a `src/utils/*.ts` source. Do not drop non-test helpers here.
- **`test/helpers/`** houses shared test infrastructure consumed across test files — data factories (`createRequest`/`createMockResponse`/`createInitialState`), app renderers (`integration.tsx`), and assertion/type-guard helpers (`assertions.ts`). It is the catch-all for "stuff tests need to share but isn't itself a test."

Precedent: the `assertDefinedToNarrowType` helper was first placed in `test/utils/` (introducing the first non-test file in a directory of `*.test.ts` files mirroring `src/utils/`), then moved to `test/helpers/` to preserve the `test/utils/` ↔ `src/utils/` symmetry.
