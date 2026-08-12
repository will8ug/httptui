# Spec: Runtime

## Purpose

Declares the Node.js runtime requirements for httptui: the minimum supported runtime version, the build target that must align with it, and the documentation surfaces that advertise it to users and contributors. This capability is concerned with toolchain and packaging, not with product behavior.

## Requirements

### Requirement: Minimum Node.js runtime version

The project SHALL declare Node.js 24 as its minimum supported runtime version. The `engines.node` field in `package.json` SHALL be set to `">=24"`. Node.js 20 and 22 SHALL no longer be supported.

#### Scenario: package.json declares Node 24 as the minimum
- **WHEN** `package.json` is read
- **THEN** the `engines.node` field SHALL equal `">=24"` (or an equivalent range that excludes all versions below 24.0.0)

#### Scenario: Installing on Node 22 produces an npm engines warning
- **WHEN** a user runs `npm install -g httptui` on a Node.js 22.x runtime
- **THEN** npm SHALL emit an `EBADENGINE` warning indicating the installed Node version does not satisfy the declared engines requirement

#### Scenario: Installing on Node 24 or newer succeeds without engines warnings
- **WHEN** a user runs `npm install -g httptui` on Node.js 24.0.0 or any newer release
- **THEN** npm SHALL NOT emit an `EBADENGINE` warning for httptui's declared engines

### Requirement: Build target matches minimum runtime

The build tool SHALL emit JavaScript compatible with the declared minimum Node.js version. The `target` field in `tsup.config.ts` SHALL be set to `node24` so emitted code may use syntax and APIs available in Node 24+.

#### Scenario: tsup target aligns with engines floor
- **WHEN** `tsup.config.ts` is read
- **THEN** the `target` option SHALL equal `"node24"`

#### Scenario: Build produces output runnable on Node 24
- **WHEN** `npm run build` completes successfully on a Node 24+ developer environment
- **THEN** `dist/cli.js` SHALL execute without syntax errors on Node 24 (verified by the existing `test/cli-smoke.test.ts` smoke test)

### Requirement: TypeScript compilation target

The TypeScript configuration SHALL target ES2024 to allow the use of ES2024 syntax features (`Object.groupBy`, `Promise.withResolvers`, `Array.fromAsync`) without downleveling. The `target` field in `tsconfig.json` SHALL be set to `"ES2024"`.

#### Scenario: tsconfig target is ES2024
- **WHEN** `tsconfig.json` is read
- **THEN** the `compilerOptions.target` field SHALL equal `"ES2024"`

### Requirement: Documentation advertises the supported runtime

User-facing documentation SHALL state that Node.js 24 or newer is required. Specifically, `README.md` SHALL contain a "Requirements" (or equivalently-named) section listing the minimum Node.js version.

#### Scenario: README lists Node 24 as the minimum
- **WHEN** a user reads `README.md`
- **THEN** the document SHALL state that Node.js 24 or newer is required to install and run httptui

### Requirement: OpenSSL 3.5 behavior documented
The `README.md` SHALL document that Node.js 24 ships OpenSSL 3.5 with security level 2, which rejects RSA/DSA/DH keys shorter than 2048 bits and prohibits RC4 cipher suites. This affects connections to legacy servers with weak certificates.

#### Scenario: README mentions OpenSSL 3.5 restrictions
- **WHEN** a user reads the TLS Troubleshooting section of `README.md`
- **THEN** the document SHALL mention that RSA keys shorter than 2048 bits are rejected by Node.js 24's OpenSSL 3.5 defaults
- **AND** the document SHALL mention that RC4 cipher suites are prohibited

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