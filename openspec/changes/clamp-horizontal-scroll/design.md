## Context

The `SCROLL_HORIZONTAL` reducer case in `src/app.tsx` (lines 135–149) currently clamps only to `Math.max(0, ...)` — no upper bound. The horizontal offset grows without limit, causing all content to scroll off-screen.

The challenge: the reducer doesn't know the maximum line width of the panel content. For the **request panel**, the line width depends on `prefix + method.padEnd(7) + target` for each visible request. For the **response panel**, it depends on the status line, headers (when verbose), and body lines — all computed at render time in their respective components.

## Goals / Non-Goals

**Goals:**
- Prevent horizontal scrolling past the point where all content is gone
- Keep at least 1 character of the longest line visible at all times
- Compute max content width in the reducer from available state

**Non-Goals:**
- Tracking max content width as persistent state (it can be computed on each scroll action)
- Changing the rendering components — clamping is purely at the state/reducer level
- Clamping per-line (we clamp based on the longest line across the whole panel, not per-line)

## Decisions

**Decision 1: Compute max line width inside the reducer**

For the **request panel**, the reducer already has `state.requests` and `state.selectedIndex`. Each request line's full width is: `2 (prefix) + 7 (padded method) + targetLength`. We compute `getRequestTarget(url).length` for each visible request and take the max.

For the **response panel**, the reducer has `state.response`, `state.verbose`, and `state.error`. We compute the max across: status line length, header line lengths (if verbose), and body line lengths.

_Alternative considered_: Having components report their max width back to state (e.g., via useEffect). Rejected — adds complexity, stale-state risk, and a render cycle lag. The reducer has enough data to compute it directly.

**Decision 2: Clamp to `maxLineWidth - 1`**

The upper bound for the offset is `maxLineWidth - 1`, ensuring at least the last character of the longest line remains visible. If `maxLineWidth` is 0 or content is empty, clamp to 0.

Formula: `Math.min(Math.max(0, offset + delta), Math.max(0, maxLineWidth - 1))`

**Decision 3: Reuse `getRequestTarget` from RequestList**

The `getRequestTarget` function is currently defined locally in `RequestList.tsx`. To use it in the reducer, extract it to a shared utility (e.g., `src/utils/request.ts`) or duplicate the simple URL parsing inline. Given the function is small (5 lines), extracting to a shared module is cleaner.

## Risks / Trade-offs

- **[Slight computation on each scroll]** → Computing max line width on every `SCROLL_HORIZONTAL` dispatch. This is trivially cheap (iterating an array of strings) and happens at human input speed.
- **[getRequestTarget duplication risk]** → If extracted to a shared util, we must ensure both the reducer and RequestList use the same function. If duplicated inline, they could diverge. Extraction is preferred.
- **[Response body can be large]** → For very large response bodies, computing `Math.max(...lines.map(l => l.length))` iterates all lines. At human scroll speed this is negligible, but worth noting.
