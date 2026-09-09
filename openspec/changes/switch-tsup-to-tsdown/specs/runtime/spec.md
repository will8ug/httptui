# Delta: runtime

## REMOVED Requirements

### Requirement: Build target matches minimum runtime

**Reason**: The requirement hardcodes the build tool's config filename (`tsup.config.ts`) and one of its scenarios reads that config file directly — tooling-shaped content that breaks on every build-tool swap. A scenario cannot be dropped from a MODIFIED block (the validator rejects omitted scenarios), so the requirement is removed and its successor added under a new name.

**Migration**: Replaced by the ADDED requirement "Build output matches minimum runtime", which states the same observable behavior (the build emits Node 24-compatible JavaScript, verified by `dist/cli.js` executing on Node 24) without naming a build tool or its config file.

## ADDED Requirements

### Requirement: Build output matches minimum runtime

The build tool SHALL emit JavaScript compatible with the declared minimum Node.js version, so that emitted code may use syntax and APIs available in Node 24+.

#### Scenario: Build produces output runnable on Node 24
- **WHEN** `npm run build` completes successfully on a Node 24+ developer environment
- **THEN** `dist/cli.js` SHALL execute without syntax errors on Node 24 (verified by the existing `test/cli-smoke.test.ts` smoke test)
