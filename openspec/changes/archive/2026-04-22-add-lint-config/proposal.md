## Why

The project declares `npm run lint` in `package.json` (`eslint src/ test/`) but has zero ESLint configuration files and zero ESLint-related devDependencies. Running the script produces no linting — it either fails or relies on global/ambient eslint with default rules, providing no meaningful code quality enforcement. Adding a proper ESLint setup ensures consistent code style, catches bugs early, and makes `npm run lint` a reliable CI gate.

## What Changes

- Add ESLint flat config (`eslint.config.js`) with TypeScript and React rules
- Add required devDependencies: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`
- Configure TypeScript-aware rules (no-floating-promises, no-unsafe-assignment, etc.) aligned with the project's `strict: true` tsconfig
- Configure React/Ink rules (hooks exhaustive-deps, refresh check for `.tsx` files)
- Disable rules that conflict with existing codebase patterns (e.g., underscore-prefixed vars in test helpers, `console` usage in CLI tool)
- Verify `npm run lint` runs cleanly on the existing codebase (fix existing violations where appropriate, add eslint-disable for intentional exceptions)

## Capabilities

### New Capabilities

- `eslint-config`: ESLint flat configuration with TypeScript, React, and Prettier compatibility rules for `src/` and `test/`

### Modified Capabilities

_(None — this is a tooling-only addition; no existing spec-level behavior changes.)_

## Impact

- **Dev dependencies**: New eslint-related packages added to `package.json` devDependencies
- **New file**: `eslint.config.js` at project root
- **Existing code**: Minor auto-fixable changes (e.g., quote style, missing return types) may be applied to pass lint; no behavioral changes
- **CI/publishing**: `npm run lint` becomes a reliable check that can be added to CI pipelines
