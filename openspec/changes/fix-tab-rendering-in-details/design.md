## Context

The request details panel (`RequestDetailsView`) renders body content line-by-line, passing each line through `shiftText` → `truncateText` before rendering in an Ink `<Text>`. These functions use `string.length` for width calculations. When a line contains tab characters (`\t`), the terminal expands them to 8-column tab stops, but `string.length` counts each `\t` as 1. This width mismatch causes the terminal to render text wider than calculated, pushing border characters and fill spaces onto wrapped terminal lines — visible as stray `│` glyphs on otherwise-blank lines.

The bug is latent in split-panel mode because the narrower content width causes `truncateText` to clip tab-containing lines (the `…` truncation removes the tabs). It manifests in fullscreen mode where the wider content width lets full-length tab-containing lines pass through unclipped.

The same mismatch affects `ResponseView`'s `wrapLine` and `truncateText` calls, but JSON responses (the primary use case) are pretty-printed with spaces via `JSON.stringify`, so tabs are unlikely in that path. Raw-mode responses with tabs would have the same issue.

## Goals / Non-Goals

**Goals:**
- Eliminate tab-induced visual artifacts (stray border characters, text overflow) in the request details panel.
- Ensure all width-calculating functions (`truncateText`, `shiftText`, `wrapLine`) operate on tab-expanded strings so their measurements match terminal rendering.
- Fix the root cause (unexpanded tabs) rather than patching symptoms (border rendering).

**Non-Goals:**
- Changing how the Postman parser stores body content (tabs are preserved in `ParsedRequest.body` for fidelity to the source).
- Adding configurable tab width (8 is the terminal standard; no user-facing setting needed).
- Fixing non-tab wide characters (e.g., CJK double-width, emoji). That's a separate concern.
- Changing the `colorizeJson` function's tab handling (it already groups `\t` with whitespace for syntax highlighting; after tab expansion, it would receive spaces instead of tabs, which is fine).

## Decisions

### Decision 1: Add `expandTabs` utility in `src/utils/text.ts`

Add a new `expandTabs(line: string, tabWidth = 8): string` function alongside `truncateText` and `shiftText`. It expands each `\t` to the number of spaces needed to reach the next multiple of `tabWidth` from the current column position.

**Rationale**: `text.ts` already houses the width-calculation utilities. Placing `expandTabs` here keeps all text-measurement logic in one place and makes it easy to call from both `RequestDetailsView` and `ResponseView`/`response-layout.ts`.

**Alternative considered**: Expand tabs at parse time in `postman-parser.ts`. Rejected because (a) it would lose the original tab characters for any future feature that needs them, and (b) it only fixes Postman imports, not `.http` files or OpenAPI specs that might also contain tabs.

### Decision 2: Apply tab expansion in `RequestDetailsView` before `shiftText`

In `RequestDetailsView.tsx`, expand each body line before passing it to `shiftText`:

```
const expanded = expandTabs(bodyLines[i] || ' ');
allLines.push(<Text>{shiftText(expanded, horizontalOffset, contentWidth)}</Text>);
```

**Rationale**: This is the narrowest fix that addresses the reported bug. Expanding before `shiftText` ensures `truncateText`'s `value.length <= maxWidth` check uses the visual width, not the pre-expansion string length.

### Decision 3: Apply tab expansion in `response-layout.ts` before `wrapLine`/`truncateText`

In `buildBodyLineVisualLines`, expand `safeLine` before any wrapping or truncation:

```
const safeLine = rawLine === '' ? ' ' : expandTabs(rawLine);
```

**Rationale**: The response view's `wrapLine` and `truncateText` calls have the same string-length-vs-visual-width mismatch. Expanding at this point ensures both paths are fixed. JSON responses are unaffected (pretty-printed with spaces), but raw-mode responses with tabs benefit.

### Decision 4: Tab width of 8

Use `tabWidth = 8` (the terminal standard). No parameter exposed to callers.

**Rationale**: Virtually all terminals use 8-column tab stops. Exposing a configurable width adds complexity for no real-world benefit.

## Risks / Trade-offs

- **Expanded lines are wider, may truncate sooner**: Lines that previously fit (because tabs were counted as 1 char each) may now be truncated with `…` after expansion. This is correct behavior — the terminal would have rendered them wider anyway. The user sees accurate truncation instead of silent overflow.
- **Body content with tabs looks different after expansion**: Tab-indented XML (e.g., 4 tabs = 32 columns) will show 32 spaces of indentation instead of terminal-expanded tabs. Visually identical in most terminals, but the underlying string is different. No user-facing impact.
- **Horizontal scroll offset semantics change slightly**: After expansion, `shiftText` slices the expanded string. Scrolling right by N columns now skips N space characters instead of N characters (which might include tabs). This is more intuitive — the horizontal offset now corresponds to visual columns.
