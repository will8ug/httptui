## Context

`ResponseView` renders the response body via `formatResponseBody(response.body, rawMode)` — which JSON-pretty-prints compact bodies into many short indented lines when `rawMode` is off — then shifts each rendered line left by `responseHorizontalOffset` via `flat.slice(offset)`.

The horizontal-scroll upper bound (`maxOffset = max(0, maxLineWidth - contentWidth)`) is computed in the reducer from `getMaxResponseLineWidth(state)`, which today measures `res.body.split('\n')` — the **raw** body. When the raw body is one long compact-JSON line (e.g. Microsoft Graph responses) but the rendered body is many short lines, `maxOffset` overshoots the longest *rendered* line by orders of magnitude. Pressing `$` sets `responseHorizontalOffset` to that overshoot; every rendered line is then `slice`d past its end and becomes empty, so the whole body vanishes.

The `navigation` spec's "Max line width for response panel" scenario says "body lines" without specifying raw vs formatted, which permitted this divergence. The clamp formula itself (`L - contentWidth`) is correct.

Two call sites consume `getMaxResponseLineWidth`:
- `SCROLL_HORIZONTAL` response branch (`reducer.ts` ~line 277) — `h`/`l` step scroll, upper bound.
- `JUMP_HORIZONTAL` response branch (`reducer.ts` ~line 377) — `$` jump-to-end, target offset.

Both share the same broken bound; both are fixed by correcting the measurement.

`getMaxRequestLineWidth` and `getMaxDetailsLineWidth` are **not** affected: each already measures the exact text its panel renders (request list prefix+target; resolved request body lines).

## Goals / Non-Goals

**Goals:**
- Make the horizontal-scroll upper bound for the response panel reflect the text `ResponseView` actually draws, so `$` and `l` can never scroll past the last visible character of the longest rendered line.
- Remove the raw-vs-formatted ambiguity in the `navigation` spec's "Max line width for response panel" scenario.
- Preserve the existing clamp formula and all keyboard bindings / action signatures.

**Non-Goals:**
- Changing wrap-mode behavior. `JUMP_HORIZONTAL` and `SCROLL_HORIZONTAL` are already no-ops when `wrapMode === 'wrap'` (reducer guards at lines 259 and 347); the bound is irrelevant in wrap mode. Not touching that.
- Re-measuring wrapped visual-line widths. In nowrap mode each source line is one visual line, so measuring formatted source-line lengths is exact. Wrap mode is guarded out, so no wrapped-width measurement is needed.
- Refactoring `getMaxRequestLineWidth` or `getMaxDetailsLineWidth` — they are already correct.
- Changing `rawMode` semantics. `formatResponseBody(body, true)` returns `body` unchanged, so the fix is a no-op in raw mode by construction.

## Decisions

### Decision 1: Measure formatted body lines, not raw body lines

`getMaxResponseLineWidth` will compute body lines from `formatResponseBody(res.body, state.rawMode)` — the same call `ResponseView` makes — before taking `Math.max(...lineLengths)`.

**Rationale**: The bound must match the rendered text. The renderer's source of truth is `formatResponseBody`; the measurement must read from the same function. Any other source creates a second source of truth and re-introduces the divergence.

**Alternatives considered**:
- *Measure in `ResponseView` and pass the bound up via a callback/action.* Rejected: would require a new render-measurement cycle, extra state, and an extra action; the reducer already owns the bound for both scroll and jump paths. The reducer can compute the same formatted string cheaply.
- *Clamp `responseHorizontalOffset` defensively in `ResponseView` during render.* Rejected: treats the symptom, not the cause. The offset would still be wrong in state, leaking into `StatusBar` indicators and any future consumer. The bound should be correct at the source.

### Decision 2: Keep the clamp formula `max(0, maxLineWidth - contentWidth)` unchanged

This places the last character of the longest line at the right edge of the viewport with zero wasted columns, and yields `0` (no scroll) when content already fits. Confirmed correct via edge-case analysis (line length `== contentWidth` → offset `0`; line length `== contentWidth + 1` → offset `1`, showing the overflow char at the right edge). See the ASCII analysis in the explore session.

### Decision 3: Single helper, both call sites fixed automatically

Both `SCROLL_HORIZONTAL` and `JUMP_HORIZONTAL` call `getMaxResponseLineWidth(state)`. Fixing the helper fixes both paths with no call-site changes. No new action types, no new fields.

## Risks / Trade-offs

- **[Risk] `formatResponseBody` is called twice per bound computation** (once in the reducer for the bound, once in `ResponseView` for rendering) → **Mitigation**: `formatResponseBody` is a `JSON.parse` + `JSON.stringify(..., null, 2)` on the response body, which is small (HTTP response bodies in a TUI context) and only runs on keypress (scroll/jump), not every frame. The cost is negligible and the duplication guarantees the bound and the render stay in sync. If bodies ever become large, the formatted string can be memoized on `state.response` + `state.rawMode`, but that is out of scope for this fix.
- **[Risk] Spec MODIFIED requirement is large (full "SCROLL_HORIZONTAL action" block copied)** → **Mitigation**: Required by the OpenSpec MODIFIED workflow to avoid detail loss at archive time. The only semantic change is the "Max line width for response panel" scenario's THEN clause plus one added scenario; the rest is preserved verbatim.
- **[Trade-off] No proactive clamping of stale offsets when raw mode toggles**: If the user scrolls right in formatted mode, then toggles raw mode on (where the longest line may be shorter), the existing `responseHorizontalOffset` could temporarily exceed the new bound until the next scroll/jump clamps it. This is pre-existing behavior (TOGGLE_RAW does not reset `responseHorizontalOffset`) and is out of scope; the render path's `slice` already degrades gracefully (shows empty/short lines) rather than crashing. Not making a change here to keep the fix minimal.
