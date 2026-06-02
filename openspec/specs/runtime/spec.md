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