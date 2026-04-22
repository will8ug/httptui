## ADDED Requirements

### Requirement: ESLint flat config file exists and is valid
The project SHALL contain an `eslint.config.js` file at the project root using the ESLint flat config format with `export default`. The config SHALL be valid ESM (compatible with the project's `"type": "module"`).

#### Scenario: Config file present and parseable
- **WHEN** `npm run lint` is executed
- **THEN** ESLint reads `eslint.config.js` without configuration errors

#### Scenario: ESM compatibility
- **WHEN** the config file uses `import` statements and `export default`
- **THEN** Node.js resolves the module correctly under `"type": "module"`

### Requirement: TypeScript-aware linting rules configured
The config SHALL enable `typescript-eslint` with type-checked rules (`strictTypeChecked`). The config SHALL use `projectService: true` in parser options to auto-discover tsconfig files. The config SHALL apply type-checked rules only to `.ts` and `.tsx` files, not to `.js`/`.mjs` files.

#### Scenario: Type-checked rules active for TypeScript files
- **WHEN** a `.ts` file contains an unsafe type assertion or floating promise
- **THEN** ESLint reports the appropriate `@typescript-eslint/*` diagnostic

#### Scenario: Type-checked rules skipped for JavaScript files
- **WHEN** a `.js` file is linted
- **THEN** type-checked rules are disabled (using `tseslint.configs.disableTypeChecked`)

### Requirement: React and Ink linting rules configured
The config SHALL enable `eslint-plugin-react` recommended rules and `eslint-plugin-react-hooks` recommended rules for `.tsx` files. The config SHALL set `react/react-in-jsx-scope` to `"off"` (new JSX transform). The config SHALL configure `react.version` to `"detect"`.

#### Scenario: React hooks rules enforced
- **WHEN** a `.tsx` component uses hooks without listing all dependencies
- **THEN** ESLint reports `react-hooks/exhaustive-deps` warning

#### Scenario: React scope rule disabled for new JSX transform
- **WHEN** a `.tsx` file does not import React explicitly
- **THEN** ESLint does NOT report `react/react-in-jsx-scope`

### Requirement: Prettier compatibility
The config SHALL include `eslint-config-prettier` (flat config variant) as the last entry in the configuration array. This SHALL disable all ESLint formatting rules that conflict with Prettier.

#### Scenario: No formatting rule conflicts
- **WHEN** both `npm run lint` and `npm run format` are executed on the same file
- **THEN** there are no conflicting formatting directives between ESLint and Prettier

### Requirement: Test file rule overrides
The config SHALL define an override for files in `test/` or matching `**/*.test.ts(x)` that relaxes rules appropriate for test code: `@typescript-eslint/no-explicit-any` off, `no-console` off, `@typescript-eslint/no-unused-vars` off, `@typescript-eslint/non-nullable-type-assertion` off.

#### Scenario: Test files allow relaxed typing
- **WHEN** a test file uses `as any` or `as unknown as Type` patterns
- **THEN** ESLint does NOT report type-safety warnings for those patterns

#### Scenario: Console usage allowed in tests
- **WHEN** a test file uses `console.log` for debug output
- **THEN** ESLint does NOT report `no-console`

### Requirement: Project-specific rule customizations
The config SHALL enforce: `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"` (underscore-prefixed params are allowed), `no-console` as warn with `allow: ["warn", "error"]` (CLI tool legitimately uses `console.error`). The config SHALL ignore `dist/`, `node_modules/`, and `coverage/` directories.

#### Scenario: Underscore-prefixed unused params allowed
- **WHEN** a function parameter is named with leading underscore (e.g., `(_, index)`)
- **THEN** ESLint does NOT report `no-unused-vars`

#### Scenario: Console.warn and Console.error allowed
- **WHEN** source code calls `console.error` or `console.warn`
- **THEN** ESLint does NOT report `no-console`

#### Scenario: Build artifacts excluded
- **WHEN** `npm run lint` runs
- **THEN** ESLint does not process files in `dist/`, `node_modules/`, or `coverage/`

### Requirement: All devDependencies declared in package.json
The project SHALL list all required ESLint packages in `devDependencies`: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier`, `globals`.

#### Scenario: npm install provides all ESLint dependencies
- **WHEN** `npm install` is run on a fresh clone
- **THEN** all ESLint-related packages are installed as devDependencies

#### Scenario: No global eslint dependency required
- **WHEN** ESLint is not installed globally
- **THEN** `npx eslint` and `npm run lint` still work correctly using local devDependencies

### Requirement: npm run lint exits successfully on existing codebase
After the initial setup (including any necessary auto-fixes), `npm run lint` SHALL exit with code 0 on the existing codebase. Any remaining intentional exceptions SHALL be marked with `// eslint-disable-next-line` comments with explanatory notes.

#### Scenario: Clean lint run
- **WHEN** `npm run lint` is executed
- **THEN** the command exits with code 0 and produces no errors

#### Scenario: Intentional exceptions are documented
- **WHEN** a file contains an `eslint-disable-next-line` comment
- **THEN** the comment includes a brief explanation of why the rule is disabled
