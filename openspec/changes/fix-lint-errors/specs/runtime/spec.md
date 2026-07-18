## ADDED Requirements

### Requirement: Lint passes cleanly
The project SHALL maintain a zero-error ESLint run across `src/` and `test/` via `npm run lint`. Lint findings SHALL be resolved by the least invasive means that preserves runtime behavior: runtime guards that the type system cannot prove necessary SHALL be preserved with per-line `eslint-disable` justifications, while genuinely dead code and redundant type constructs SHALL be removed.

#### Scenario: Lint exits with zero errors
- **WHEN** `npm run lint` is executed on the repository
- **THEN** ESLint SHALL exit with status 0, reporting zero errors and zero warnings

#### Scenario: Runtime bounds guards are preserved with justification
- **WHEN** a `no-unnecessary-condition` finding corresponds to an array-index or Record-key existence guard (e.g. `args[i + 1]`, `state.availableEnvironments[index]`, `certificates[key]`) that the type system cannot prove necessary because `noUncheckedIndexedAccess` is not enabled
- **THEN** the guard SHALL remain in the code and the finding SHALL be suppressed with a per-line `eslint-disable` comment carrying a justification

#### Scenario: Dead code and redundant type constructs are removed
- **WHEN** a lint finding identifies an unused variable, or a type assertion that does not change the expression's type
- **THEN** the dead code or redundant assertion SHALL be removed rather than suppressed

#### Scenario: Intentional dynamic deletes are preserved with justification
- **WHEN** a `no-dynamic-delete` finding corresponds to a deliberate computed-key deletion (e.g. restoring environment variables in tests)
- **THEN** the deletion SHALL remain in the code and the finding SHALL be suppressed with a per-line `eslint-disable` comment carrying a justification
