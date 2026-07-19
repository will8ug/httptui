# AGENTS.md

Guidance for coding agents (and humans) working in this repository.

## OpenSpec spec maintenance

Main specs (`openspec/specs/`) describe **system capabilities and observable behavior** — nothing else.

- **Maintain capability specs.** Each spec covers a user-facing capability (`response-search`, `text-wrap`, `request-details`, …). Requirements state what the system SHALL do; scenarios state observable outcomes (WHEN/THEN).
- **No process-shaped framing.** Never create specs for test infrastructure, and never mandate test files, test patterns, directory layouts, or helper imports in a spec. "The test suite SHALL include `test/components/X.test.tsx`" is a smell — tests verify spec'd behavior, but specs do not prescribe tests.
- **Tooling and test infrastructure are self-documenting** in the repo (config files, TypeScript types, existing test files). Do not duplicate them into specs.
- **Before adding a scenario, check for an existing home.** If another capability spec already mandates the behavior, do not restate it — cross-reference instead. Duplicated behavior across specs means every change needs two spec updates.

Precedent: the `testing` spec was deleted for being purely process-shaped (`1af0b01`), the `eslint-config` spec was removed as self-documenting tooling (`8fad1a7`), and `component-tests` was distributed into capability specs (`response-view`, `status-bar`, `request-details`) by the `distribute-component-tests-spec` change.
