## Context

httptui's UI layer is built on Ink (`^6.0.0`, resolved `6.8.0`). The project already satisfies all of Ink v7's peer requirements exactly: React 19.2.4 is installed (v7 requires `>=19.2.0`), Node `>=24` satisfies v7's `>=22` floor, and TypeScript `^6.0.3` is well above v7's type expectations. `@inkjs/ui@^2.0.0` (only `Spinner` is consumed, in `ResponseView.tsx`) and `ink-testing-library@^4.0.0` (used by all 20 test files) are confirmed by the user to remain compatible with Ink v7.

httptui's only consumer of Ink's input API is `src/app.tsx`, which uses a single `useInput` handler. The existing codebase happens to be forward-compatible with v7's breaking changes already:

- The three backspace handlers (`app.tsx:197`, `:231`, `:339`) use `key.backspace || key.delete`. v6 fires `key.delete` on physical Backspace; v7 fires `key.backspace` on physical Backspace and reserves `key.delete` for the actual Delete key (e.g., Fn+Backspace). The OR pattern accepts both, so it is correct in both versions.
- The five Escape handlers (`app.tsx:140`, `:148`, `:210`, `:244`, `:296`, `:351`, `:356`) all check `key.escape` and return before any printable-input guard runs. The printable guards (`app.tsx:202`, `:236`, `:344`) test `!key.ctrl && !key.meta`. In v6, plain Escape co-set `key.meta`; in v7 it does not. Because Escape is consumed earlier, the guard's `!key.meta` clause is unaffected by the v7 change for Escape. The change only refines behavior for Alt/Meta combos, which are correctly blocked by the guard in both versions.

No other Ink API surface is in use that v7 changes: `Box`, `Text`, `useStdout` (`stdout.columns`/`stdout.rows`), `useApp().exit()`, and the `render` call in `cli.tsx` all have unchanged signatures in v7. No subpath imports (`ink/color`, `ink/jsx-runtime`, etc.) and no internal context APIs (`StdinContext`, `AppContext`, `measureElement`, `useStdin`, `useEffectEvent`) are consumed.

## Goals / Non-Goals

**Goals:**

- Move httptui onto Ink's currently maintained major line (`^7.1.0`).
- Land input-handling correctness improvements that the code already tolerates (Backspace vs Delete split, Meta reserved for Alt/Meta combos).
- Verify that no observable behavior changes by running the full test suite, typecheck, lint, and build unmodified.

**Non-Goals:**

- Adopt v7-only additive features (`usePaste`, `useWindowSize`, `useBoxMetrics`, `useAnimation`, `suspendTerminal`, `render({alternateScreen, interactive})`, `<Box aspectRatio/position>`, `<Text wrap="hard">`). These are available post-upgrade but adopting any is a separate future change.
- Add new tests to verify Ink's own behavior — the existing test suite is the regression net for httptui's observable behavior, not Ink's.
- Update `@inkjs/ui` or `ink-testing-library` versions. Both are confirmed compatible per the user.
- Refactor `useInput` in `app.tsx` beyond the optional cleanup noted below. The OR-pattern backspace checks are intentional defensive coding and remain correct under v7.

## Decisions

### D1: Target `^7.1.0` rather than `^7.0.4`

**Decision**: Bump `ink` to `^7.1.0` in `package.json`.

**Rationale**: `^7.1.0` is the lowest version that:
- Includes the `v7.0.1` fix restoring `useApp().exit()` typing (broken in `v7.0.0`, called from `app.tsx:exit()` and `app.tsx:362`).
- Includes the `v7.0.2` fix preventing a hang on component swap when raw mode is disabled (the runtime env-switcher and overlay toggles perform component swaps).
- Includes the `v7.0.4` shared resize listener fix (#952) which matters for `useStdout` consumers like this codebase's terminal-dimensions-driven layout code.
- Exposes `suspendTerminal(callback?)` for potential future use (e.g., delegating to `$EDITOR`), at no cost since we're not adopting it in this change.

**Alternatives considered**:
- `^7.0.4` — dodges minor-version churn but ships without `suspendTerminal`. Saves nothing meaningful: the patch-level fixes between 7.0.4 and 7.1.0 are additive.
- `^7.0.0` — explicitly rejected because of the `useApp` typing regression.

### D2: Make no source code changes as part of the upgrade

**Decision**: The upgrade is purely a `package.json` + lockfile change. `src/app.tsx` is not modified.

**Rationale**: Every v7 breaking change is already absorbed by the existing code's defensive patterns (see Context). Modifying the source during a dep upgrade blurs the distinction between "library changed behavior" and "we changed behavior", making any later test failure harder to attribute. Keep the change surface minimal and let the test suite prove preservation.

**Optional cleanup deferred to a separate decision point post-upgrade**: simplify the three `key.backspace || key.delete` checks (`app.tsx:197`, `:231`, `:339`) to `key.backspace` and add a one-line comment noting that `key.delete` is reserved for the actual Delete key under Ink v7. This is a clarification that makes the v7 semantics explicit in code; it does not change observable behavior in either direction (Delete-key users today are silently swallowed by the OR pattern in v6; in v7 with the simplification they would still be swallowed because the simplified branch tests only `key.backspace`). Per AGENTS.md, comments are reserved for non-obvious knowledge — the v7 Backspace/Delete distinction qualifies.
**Action**: Listed as an explicit, separately-decidable task in `tasks.md`; execute only if the user opts in.

### D3: Keep `@inkjs/ui@^2.0.0` and `ink-testing-library@^4.0.0` unchanged

**Decision**: Bump only `ink`. Leave the two adjacent dependencies at their current ranges.

**Rationale**: The user has studied compatibility and confirmed both work with Ink v7. `@inkjs/ui` is consumed in a single site (`Spinner` in `ResponseView.tsx`) — the blast radius is one component. `ink-testing-library` is used by all 20 test files — bumping it preemptively would be a separate, larger change with its own risk profile. Treat the upgrade as one variable at a time.

### D4: Verification = full existing test suite + typecheck + lint + build, unmodified

**Decision**: No new tests added. The four existing verification gates must all pass with no test edits:
- `npm run typecheck` (`tsc --noEmit`) — catches TypeScript peer `@types/react@^19.0.0` against Ink v7's `>=19.2.0` peer expectation.
- `npm test` (`vitest run --coverage`) — exercises all 20 test files through `ink-testing-library`; covers `navigation`, `text-wrap`, `response-search`, `response-view`, `request-details`, `shortcuts`, and `envSelect` behavior.
- `npm run lint` — `eslint src/ test/`.
- `npm run build` — `tsup` build to verify the production bundle.

**Rationale**: Per the proposal, no observable behavior should change. A test failure under this upgrade is a regression signal, not a defect in the test. Adding tests now would conflate verifying preservation with verifying new behavior.

## Risks / Trade-offs

**[Risk] `ink-testing-library v4` silently passes tests against Ink v7 even if real terminal rendering differs** → **Mitigation**: After the test suite is green, do a manual smoke test of the actual TUI against an `.http` file (load file, send request, navigate, toggle wrap/details/fullscreen, search response, switch env, save-as-http). The integration tests cover most of these but live-render terms-vs-emulated-stdout can diverge in edge cases like colored-borders and CJK widths.

**[Risk] Ink v7's tightened `key.meta` semantics change Alt-combo navigation on macOS terminals** → **Mitigation**: None of httptui's bindings use Alt combos (single-letter keys, ctrl+c, arrow keys, Vim hjkl, and Tab are the only navigation inputs). The risk reduces to "Alt combos are now blocked that previously leaked through as printable input", which is a strict improvement. `navigation` capability tests cover the in-scope keys.

**[Risk] Transitive bumps in `wrap-ansi` (^9 → ^10) and `slice-ansi` (^8 → ^9) change wrapping behavior for emoji or wide-character content** → **Mitigation**: The `text-wrap` capability has existing tests (per the `openspec/specs/text-wrap` spec). Any wrap regression will surface in those tests; if a wrap test fails post-upgrade, treat it as a wrap-ansi regression and report before continuing.

**[Risk] Ink v7 may emit a React 19.2 deprecation warning in `useInput` that surfaces as a console error in tests** → **Mitigation**: Ink v7 uses `useEffectEvent` internally, which is shipped in React 19.2.4. If any test emits a `useEffectEvent` warning, capture it and escalate as an Ink defect rather than patching the codebase around it.

**Trade-off: pinning vs caret**. Using `^7.1.0` will auto-pull future v7 minor/patch releases. This is consistent with how ink's `^6.0.0` was managed (resolved up to `6.8.0` over time). If reproducibility across CI runs matters more than auto-patching, pin to `~7.1.0` instead. Default stays with `^7.1.0` to match the existing pattern.