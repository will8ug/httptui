## 1. Install Dependencies

- [x] 1.1 Add ESLint devDependencies to `package.json`: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier`, `globals`
- [x] 1.2 Run `npm install` to verify all packages resolve without errors

## 2. Create ESLint Flat Config

- [x] 2.1 Create `eslint.config.js` at project root with ESM `export default` format
- [x] 2.2 Add ignores section: `dist/**`, `node_modules/**`, `coverage/**`
- [x] 2.3 Add `js.configs.recommended` as base rules
- [x] 2.4 Add `typescript-eslint` strict-type-checked config with `projectService: true` and `tsconfigRootDir: import.meta.dirname`
- [x] 2.5 Add `eslint-plugin-react` flat recommended config for `src/**/*.tsx` files with `react.version: "detect"` and `react/react-in-jsx-scope: "off"`
- [x] 2.6 Add `eslint-plugin-react-hooks` flat recommended config
- [x] 2.7 Add project-specific rules: `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"`, `no-console` as warn with `allow: ["warn", "error"]`, `restrict-template-expressions` with `allowNumber: true, allowNullish: true`
- [x] 2.8 Add test file overrides for `test/**` with type-checked disabled and relaxed rules: `@typescript-eslint/no-explicit-any`, `no-console`, `@typescript-eslint/no-unused-vars`, `@typescript-eslint/non-nullable-type-assertion`, plus additional type-safety relaxations
- [x] 2.9 Add `eslint-config-prettier` as the **last** config entry

## 3. Verify and Fix Existing Codebase

- [x] 3.1 Run `npm run lint` and capture all warnings/errors
- [x] 3.2 Auto-fix safe violations with `npx eslint --fix src/ test/`
- [x] 3.3 Add `// eslint-disable-next-line <rule> -- <reason>` comments for intentional exceptions that cannot be auto-fixed
- [x] 3.4 Run `npm run lint` and confirm exit code 0

## 4. Validate

- [x] 4.1 Confirm `npm run lint` exits 0 with zero errors
- [x] 4.2 Confirm `npm run build` still succeeds (no build regressions)
- [x] 4.3 Confirm `npm test` still passes (no test regressions)
- [x] 4.4 Verify `eslint.config.js` is not ignored by the ignore patterns
