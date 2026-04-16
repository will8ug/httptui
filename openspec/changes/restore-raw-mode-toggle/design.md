## Context

The `r` key raw mode toggle was removed in the `2026-04-12-remove-raw-mode-toggle` change because it appeared invisible for typical JSON responses. The removal touched `types.ts` (AppState + Action), `shortcuts.ts`, `app.tsx` (reducer + key handler + prop), `ResponseView.tsx` (rawMode prop + rendering branch), and a standalone `formatter.ts` file that no longer exists.

The current codebase has no `rawMode` state, no `TOGGLE_RAW` action, and no `r` key binding. Response body rendering always attempts JSON pretty-printing via `JSON.parse` + `JSON.stringify(parsed, null, 2)` with syntax colorization, falling back to as-is for non-JSON. The `ResponseView` component handles formatting inline (no separate `formatter.ts`).

The existing toggle pattern (`wrapMode` / `TOGGLE_WRAP` / `w` key) provides the exact architectural template for restoring raw mode.

## Goals / Non-Goals

**Goals:**
- Restore the `r` key shortcut to toggle raw response body rendering
- When raw mode is active, display the response body exactly as received (no JSON pretty-printing, no colorization)
- Provide a visual indicator in the response panel title when raw mode is active
- Add 2 unit tests for the `TOGGLE_RAW` reducer action
- Follow the existing `TOGGLE_WRAP` pattern exactly for consistency

**Non-Goals:**
- Adding a raw mode visual indicator in the status bar beyond the existing shortcut label
- Changing how non-JSON responses are rendered (they already render as-is)
- Creating a separate `formatter.ts` module (the original had one, but current codebase does formatting inline in `ResponseView`)
- Modifying the `w` (wrap) toggle behavior or interaction with raw mode

## Decisions

1. **Use a boolean `rawMode` instead of a string union type** — The original implementation used a boolean. Unlike `wrapMode: 'nowrap' | 'wrap'` which has two named modes, raw mode is a simple on/off: either format JSON or don't. A boolean (`rawMode: boolean`, default `false`) is clearer and simpler. Alternative considered: `RawMode = 'formatted' | 'raw'` union — rejected as over-engineering for a binary toggle.

2. **Skip both pretty-printing and colorization in raw mode** — When `rawMode` is `true`, the response body renders as plain text using the exact bytes from the server. This means no `JSON.parse`/`JSON.stringify` and no `colorizeJson()`. The body is split by newlines and rendered as `<Text>` elements. Alternative considered: colorize but don't reformat — rejected because raw mode should mean "show me exactly what the server sent."

3. **Show `Response [raw]` in panel title** — Mirrors the existing `Response [wrap]` pattern for `wrapMode`. When both are active, show `Response [raw] [wrap]`. This keeps the indicator consistent and discoverable.

4. **`r` shortcut with `showInBar: false, showInHelp: true`** — The status bar already has 6 shortcuts (the documented maximum). The `r` shortcut appears in the help overlay (`?`) but not in the status bar. This matches shortcuts like `w`, `o`, `R`, and `d`.

5. **Test file follows `wrap-toggle.test.ts` pattern** — New file `test/raw-toggle.test.ts` with a local `createInitialState()` and minimal local reducer handling only `TOGGLE_RAW`. Two test cases: toggle on and toggle off. This matches the established convention where each test file duplicates only the reducer logic it tests.

## Risks / Trade-offs

- **Raw mode less useful for pretty-printed server responses** → This was the original removal rationale. Mitigation: the feature is opt-in (off by default) and the panel title clearly indicates when active. Users who don't need it simply never press `r`.
- **Stale `rawMode` in existing test files** → `file-load.test.ts` and `reload.test.ts` still reference `rawMode: false` (a pre-existing drift from the removal). Re-adding `rawMode` to `AppState` will actually fix these stale references. No risk — it's a net positive.
