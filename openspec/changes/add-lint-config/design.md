## Context

httptui is a TypeScript + React (Ink) CLI project with 24 source files in `src/` and test files in `test/`. The `package.json` declares `"lint": "eslint src/ test/"` but there are zero ESLint config files and zero ESLint-related devDependencies. The project uses `strict: true` in tsconfig, ESM modules, and JSX with `react-jsx` transform.

ESLint v10+ (flat config) is available globally but the project needs its own self-contained configuration that works via `npm run lint` without requiring any global installation.

## Goals / Non-Goals

**Goals:**
- Make `npm run lint` a working, meaningful check that enforces code quality rules
- Use ESLint flat config format (`eslint.config.js`) — the standard for ESLint v9+
- Apply TypeScript-aware rules that align with the project's `strict: true` tsconfig
- Apply React/Ink rules (hooks, refresh) for `.tsx` files
- Disable formatting rules that conflict with Prettier (already used via `npm run format`)
- Lint passes cleanly on existing codebase after initial setup (with intentional exceptions documented)

**Non-Goals:**
- Adding Prettier configuration files (prettier already works via defaults/global config)
- Adding lint to CI pipeline (out of scope — can be done later)
- Changing existing code style beyond what ESLint auto-fix can handle
- Adding custom project-specific rules beyond the standard plugin configs

## Decisions

### 1. Flat config format (`eslint.config.js`)

**Choice**: ESLint flat config (`.js` with `export default`).
**Alternative**: Legacy `.eslintrc.json` — deprecated in ESLint v9+, removed in v10+.
**Rationale**: ESLint v10+ is the baseline; flat config is the only supported format going forward. The project uses ESM (`"type": "module"`), so `eslint.config.js` with `export default` fits naturally.

### 2. Plugin stack

**Choice**: `typescript-eslint` + `eslint-plugin-react` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `eslint-config-prettier`.
**Alternative**: `@typescript-eslint/*` packages individually (old approach) or `@antfu/eslint-config` (opinionated preset).
**Rationale**: `typescript-eslint` is the official successor to `@typescript-eslint/eslint-plugin` and bundles everything. React plugins provide hooks and refresh rules essential for Ink (React-based). `eslint-config-prettier` disables all formatting rules so Prettier remains the sole formatter. Avoiding opinionated presets keeps the config transparent and maintainable.

### 3. Rule severity strategy

**Choice**: Start with `eslint-plugin-react` recommended + `eslint-plugin-react-hooks` recommended + `typescript-eslint` strict-type-checked (as "warn" for initial adoption, "error" after cleanup).
**Alternative**: Use `typescript-eslint` strict-type-checked at "error" immediately.
**Rationale**: The existing codebase has never been linted. Running strict rules at "error" immediately would create too many failures. Starting at "warn" lets the team see all issues without blocking development, then escalate to "error" after fixing.

### 4. Test-specific overrides

**Choice**: Relax certain rules in `test/` directory — allow `@typescript-eslint/no-explicit-any` (test mocks), `@typescript-eslint/non-nullable-type-assertion` (type helpers), and `no-console` (test output).
**Alternative**: Same strict rules everywhere.
**Rationale**: Test files use mock patterns and type assertions that are intentional and safe. Strict enforcement in tests would require excessive eslint-disable comments without improving quality.

### 5. Prettier integration approach

**Choice**: `eslint-config-prettier` only — no `eslint-plugin-prettier`.
**Alternative**: `eslint-plugin-prettier` to run Prettier via ESLint.
**Rationale**: Running Prettier through ESLint is slower and creates coupling. The project already has `npm run format` for Prettier. `eslint-config-prettier` simply turns off conflicting ESLint rules — the lightest touch.

## Risks / Trade-offs

- **[Initial lint noise]** Running `typescript-eslint` strict-type-checked on an unlinted codebase will produce many warnings → Mitigate by starting at "warn" severity; fix incrementally.
- **[New devDependencies]** Adds 7+ packages to devDependencies → Minimal risk; all are dev-only and widely used.
- **[Config drift]** Flat config ecosystem is still evolving; plugin APIs may change → Mitigate by pinning major versions and using official `typescript-eslint` package.
- **[False positives]** Type-checked rules may flag valid patterns (e.g., discriminated union narrowing) → Mitigate with targeted `eslint-disable` comments with explanatory notes.
