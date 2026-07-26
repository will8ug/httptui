## 1. Bump Ink version

- [ ] 1.1 Update `ink` in `package.json` from `^6.0.0` to `^7.1.0`. Do not change `@inkjs/ui` (`^2.0.0`) or `ink-testing-library` (`^4.0.0`) ranges.
- [ ] 1.2 Run `npm install` to regenerate `package-lock.json` and install the new major. Verify `npm ls ink` reports `7.1.0` or compatible (`7.1.x`).
- [ ] 1.3 Confirm the install tree reports no peer-dependency conflicts for `ink`, `@inkjs/ui`, or `ink-testing-library`. If a peer conflict surfaces, STOP and report the exact error before overriding it.

## 2. Verify preservation (no source edits)

- [ ] 2.1 Run `npm run typecheck` (`tsc --noEmit`). Expected: zero new errors. If a `useApp().exit` typing error surfaces, confirm `ink` resolved to `>=7.0.1` (the fix landed in `v7.0.1`).
- [ ] 2.2 Run `npm run lint` (`eslint src/ test/`). Expected: zero new lint issues.
- [ ] 2.3 Run `npm test` (`vitest run --coverage`). Expected: all 20 test files pass with no edits. Treat any failure as a behavior regression — investigate before changing any test.
- [ ] 2.4 Run `npm run build` (`tsup`). Expected: clean build with no emitted warnings.
- [ ] 2.5 Manually smoke-test the actual TUI against an `.http` file (or a postman/OpenAPI fixture) covering: load file, send a request, navigate the result with `j`/`k`/`g`/`G`/`0`/`$`, toggle `v`/`w`/`r`/`d`/`f`, enter search (`/`) and confirm, navigate matches with `n`/`N`, dismiss search with Escape, enter Env-select (`E`), enter Save-as-http (`S`), cancel overlays with Escape, quit with `q`. Record any visual difference (border color, wrap behavior, search bar position) and decide whether to fix forward as a separate change.

## 3. Optional: simplify `key.backspace || key.delete` sites

- [ ] 3.1 (OPT-IN — confirm with user first) Simplify the three `key.backspace || key.delete` checks in `src/app.tsx` (`fileLoad` mode at line 197, `search` mode at line 231, `saveLoad` mode at line 339) to `key.backspace` only.
- [ ] 3.2 (OPT-IN — pair with 3.1) Add a one-line comment at each of the three sites noting that `key.delete` is reserved for the actual Delete key (Fn+Backspace on macOS) under Ink v7, so the simplified check intentionally leaves Delete as a no-op in text-input modes. This comment qualifies under AGENTS.md's gotcha exception (v7's Backspace/Delete split is non-obvious).
- [ ] 3.3 (If 3.1 applies) Re-run `npm run typecheck && npm test && npm run lint && npm run build` and confirm all four remain green. The test suite's backspace scenarios must pass unmodified.

## 4. Close-out verification

- [ ] 4.1 Re-run `npm run typecheck && npm test && npm run lint && npm run build` end-to-end to confirm a single green run after any optional cleanup.
- [ ] 4.2 Inspect `git diff` and confirm the changeset is restricted to `package.json`, `package-lock.json`, and (only if Step 3 was opted-in) `src/app.tsx`. No other files should be modified by this change.
- [ ] 4.3 Report a brief summary to the user with the resolved `ink` version, test counts, and any manual smoke-test observations.