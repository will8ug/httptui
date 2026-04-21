## 1. Install Dependencies

- [ ] 1.1 Add ESLint devDependencies to `package.json`: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier`, `globals`
- [ ] 1.2 Run `npm install` to verify all packages resolve without errors

## 2. Create ESLint Flat Config

- [ ] 2.1 Create `eslint.config.js` at project root with ESM `export default` format
- [ ] 2.2 Add ignores section: `dist/**`, `node_modules/**`, `coverage/**`, `*.js`, `*.mjs` (except `eslint.config.js` itself)
- [ ] 2.3 Add `js.configs.recommended` as base rules
- [ ] 2.4 Add `typescript-eslint` strict-type-checked config with `projectService: true` and `tsconfigRootDir: import.meta.dirname`
- [ ] 2.5 Add `eslint-plugin-react` flat recommended config for `**/*.tsx` files with `react.version: "detect"` and `react/react-in-jsx-scope: "off"`
- [ ] 2.6 Add `eslint-plugin-react-hooks` flat recommended config
- [ ] 2.7 Add project-specific rules: `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"`, `no-console` as warn with `allow: ["warn", "error"]`
- [ ] 2.8 Add test file overrides for `test/**` and `**/*.test.ts(x)`: disable `@typescript-eslint/no-explicit-any`, `no-console`, `@typescript-eslint/no-unused-vars`, `@typescript-eslint/non-nullable-type-assertion`
- [ ] 2.9 Add `eslint-config-prettier/flat` as the **last** config entry

## 3. Verify and Fix Existing Codebase

- [ ] 3.1 Run `npm run lint` and capture all warnings/errors
- [ ] 3.2 Auto-fix safe violations with `npx eslint --fix src/ test/`
- [ ] 3.3 Add `// eslint-disable-next-line <rule> -- <reason>` comments for intentional exceptions that cannot be auto-fixed
- [ ] 3.4 Run `npm run lint` and confirm exit code 0

## 4. Validate

- [ ] 4.1 Confirm `npm run lint` exits 0 with zero errors
- [ ] 4.2 Confirm `npm run build` still succeeds (no build regressions)
- [ ] 4.3 Confirm `npm test` still passes (no test regressions)
- [ ] 4.4 Verify `eslint.config.js` is not ignored by the ignore patterns
