## Why

Pressing `$` (jump to horizontal end) or scrolling right with `l` in the response panel can make the entire response body vanish. This happens whenever the server returns **compact/minified JSON** (e.g. Microsoft Graph) and raw mode is off: the horizontal-scroll upper bound is computed from the *raw* response body (one very long line), but the panel renders the *formatted* body (many short indented lines). The bound overshoots the actual rendered content, so `flat.slice(offset)` cuts every line to empty and the body disappears. The `navigation` spec's "Max line width for response panel" requirement is ambiguous about which body lines to measure, which allowed this implementation/renderer divergence.

## What Changes

- Amend `getMaxResponseLineWidth` so the body lines it measures are the **formatted** body lines — the same string `ResponseView` renders (`formatResponseBody(res.body, state.rawMode)`) — instead of the raw `res.body`.
- The clamp formula `max(0, maxLineWidth - contentWidth)` is unchanged (it is correct: it places the last content character at the right edge without scrolling past fitting content).
- The fix applies identically to both `SCROLL_HORIZONTAL` (`h`/`l` step scroll) and `JUMP_HORIZONTAL` (`$` jump-to-end, `0` jump-to-start), since both derive their upper bound from `getMaxResponseLineWidth`.
- Raw mode behavior is unchanged: `formatResponseBody(body, true)` returns `body` verbatim, so the measurement is a no-op there.
- No changes to `getMaxRequestLineWidth` or `getMaxDetailsLineWidth`: those already measure the exact text their panels render (request list prefix+target; resolved request body lines).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `navigation`: The "Max line width for response panel" requirement is amended to specify that the body lines measured for the horizontal-scroll upper bound SHALL be the **formatted** body lines (the output of `formatResponseBody(response.body, rawMode)`), matching the text `ResponseView` actually renders. This removes the raw-vs-formatted ambiguity that caused the body-disappearance bug.

## Impact

- **Code**: `src/core/reducer.ts` — `getMaxResponseLineWidth` gains a `formatResponseBody` call mirroring `ResponseView`'s render path. Both call sites (`SCROLL_HORIZONTAL` response branch ~line 277, `JUMP_HORIZONTAL` response branch ~line 377) consume the corrected bound with no call-site changes.
- **Specs**: `openspec/specs/navigation/spec.md` — "Max line width for response panel" scenario is clarified to require formatted body lines.
- **Tests**: New/updated reducer tests covering (a) compact JSON body in non-raw mode — bound matches formatted max line, `$` does not blank the panel; (b) raw mode — bound unchanged from current behavior; (c) `h`/`l` step scroll respects the corrected bound and cannot scroll past formatted content.
- **No breaking changes**: The clamp formula, action signatures, and keyboard bindings are unchanged. The only observable difference is that the previously-broken cases now scroll correctly.
