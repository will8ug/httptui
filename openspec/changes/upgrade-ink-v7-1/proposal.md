## Why

`ink` is currently pinned to `^6.0.0` (resolved `6.8.0`). The project already runs React 19.2.4 and Node >=24, which satisfy Ink v7's peer requirements exactly. Upgrading to `^7.1.0` moves httptui onto Ink's currently maintained major line and lands two input-handling correctness fixes (physical Backspace reported as `key.backspace` rather than `key.delete`, and plain Escape no longer co-flagging `key.meta`) that align Ink's behavior with how the codebase already defends against ambiguity.

## What Changes

- Bump `ink` from `^6.0.0` to `^7.1.0` in `package.json` and regenerate the lockfile.
- No source changes are required to absorb v7's breaking changes; the existing `useInput` handler in `src/app.tsx` is already forward-compatible:
  - All backspace handling uses `key.backspace || key.delete` (lines 197, 231, 339), which v7's `key.backspace`/`key.delete` split preserves correctly.
  - All Escape handling checks `key.escape` and returns before reaching the `!key.meta` printable-input guard (lines 148, 210, 296, 351, 356), so v7's tighter `key.meta` semantics cannot cause regressions.
- Optional cleanup (left as an explicit task, not a requirement of the upgrade): simplify the three `key.backspace || key.delete` checks to `key.backspace` with a code comment noting `key.delete` is reserved for the actual Delete key (Fn+Backspace on macOS). This is a clarification, not a behavior change.
- `@inkjs/ui` and `ink-testing-library` remain at their current versions (`^2.0.0` and `^4.0.0`) — confirmed compatible with Ink v7 by the user.
- Full test suite is the verification that observable behavior is preserved.

## Capabilities

### New Capabilities

_None._ This is an internal dependency upgrade. No new user-facing capability is introduced.

### Modified Capabilities

_None._ No observable behavior changes. The v7 input-handling refinements (Backspace/Delete split, Meta-on-Alt-only) are correctness improvements that the existing code already tolerates — they tighten pre-existing ambiguity rather than altering documented behavior. All existing capability specs (e.g., `navigation`, `text-wrap`, `response-search`) continue to hold unchanged, as verified by the test suite.

## Impact

- **Dependencies**: `package.json` and `package-lock.json` — `ink` moves from `^6.0.0` (resolved `6.8.0`) to `^7.1.0`. `@inkjs/ui@^2.0.0` and `ink-testing-library@^4.0.0` are unchanged.
- **Transitive deps**: Ink v7 bumps `wrap-ansi` (^9 → ^10) and `slice-ansi` (^8 → ^9). These are internal to Ink's rendering and have no observable effect on httptui's output.
- **Source code**: `src/app.tsx` is the only file that touches Ink's `useInput` API. No edits are required for the upgrade; optional cleanup of the three `key.backspace || key.delete` sites is identified in tasks.
- **Tests**: 20 test files use `ink-testing-library` (`render`, `cleanup`). All must continue to pass unmodified. A test failure during application of this change signals a behavior regression, not a test defect.
- **Build/tooling**: `tsc --noEmit`, `tsup` build, `eslint`, and `vitest run --coverage` must all remain green.