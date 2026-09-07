# Design: fix-wide-char-width

## Context

All width decisions in the text pipeline measure UTF-16 code units (`String.prototype.length` / `.slice()`): `wrapLine` and `wrapColorizedSegments` in `src/utils/wrap.ts`; `truncateText`, `shiftText`, `expandTabs` in `src/utils/text.ts`; longest-line measurement in `src/utils/scroll.ts`. Terminals render display cells (CJK = 2 cells; emoji clusters = 2 cells as one grapheme). In wrap mode the over-wide lines render with no backstop (`{ kind: 'pass' }` in `ResponseView`), so Ink re-wraps them at the panel's true width, rows multiply, and the panel chrome corrupts. See proposal.md — Why.

Ink 7.1 already measures text internally with `string-width@^8.2.0` (grapheme-aware). The app's own pipeline disagrees with it only because it counts code units.

Per AGENTS.md design-goal consistency: the pseudocode below is authoritative for implementation agents.

## Goals / Non-Goals

**Goals:**
- One shared width/slicing primitive used by wrap, truncate, shift, tab-expansion, and scroll-clamp paths — no per-callsite reimplementation.
- Behavior identical to today for ASCII-only content (cells == code units), so existing tests pass unchanged.
- Grapheme clusters (CJK, emoji ZWJ sequences, flags, combining marks) never split at any boundary; boundaries round down.
- A render-time clamp in the response pipeline guarantees no emitted line exceeds the panel content width even if a width bug regresses later.

**Non-Goals:**
- Replacing Ink's internal wrapping/rendering — the app keeps pre-constructing visual lines and handing them to Ink.
- Fixing ambiguous-width policy (e.g. `…`, `⚠`) beyond what `string-width`'s defaults give; defaults are accepted as the single source of truth.
- Rewriting the editor's (`EditOverlay`/`edit.ts`) visual-column model beyond what it inherits from the shared utilities.
- Changing wrap/scroll state semantics, key bindings, or panel layout constants (`RESPONSE_PANEL_CHROME` etc. are already correct integers).

## Decisions

### Decision 1: `string-width@^8` as the sole width function

Add `string-width@^8` as a direct dependency. It matches the major version Ink 7.1 uses internally (`^8.2.0`), so npm resolves a single copy in the tree. Mixed `string-width` majors measuring the same string differently is a known layout-corruption class upstream (ink#733: measure-vs-render disagreement across v7/v8).

Alternatives considered: hand-rolled East-Asian-Width tables (reimplements a maintained library, drifts from Ink's own numbers — reintroduces the disagreement); `Intl.Segmenter` alone (segments but does not measure widths).

### Decision 2: Cell-budget primitives in `src/utils/text.ts`

```
cellWidth(text): number                  // stringWidth(text)
sliceByCells(text, maxCells): string     // longest prefix whose cellWidth <= maxCells,
                                         // cut only at grapheme boundaries (round DOWN)
sliceFromCells(text, startCells, maxCells): string
                                         // prefix of the substring beginning at the first
                                         // grapheme boundary at-or-after startCells,
                                         // budgeted to maxCells
clampSegmentsToWidth(segments, maxCells): ColorSegment[]
                                         // walk segments left-to-right accumulating cells,
                                         // keep whole clusters, drop everything past budget
```

Grapheme iteration uses `Intl.Segmenter` (Node ≥ 16; the app requires Node ≥ 24). Cluster cell width = `stringWidth(cluster)` (0-width joiners/markers attach to their cluster, so no orphan half-width pieces exist). All four live in `src/utils/text.ts` next to their consumers; `test/utils/text.test.ts` mirrors them per the repo's test layout convention.

Alternative considered: a new `src/utils/width.ts` module — rejected; the functions are small and belong with the text utilities they serve, and a separate module fragments the mirror-symmetry layout.

### Decision 3: `wrapLine` keeps its algorithm, changes its ruler

Same greedy algorithm, measuring cells:

```
wrapLine(line, maxWidth):
  if maxWidth <= 0: return []
  if line == '': return [' ']
  if cellWidth(line) <= maxWidth: return [line]
  lines = []
  remaining = line
  while cellWidth(remaining) > maxWidth:
      prefix = sliceByCells(remaining, maxWidth)        # grapheme-safe prefix
      lastSpace = prefix.lastIndexOf(' ')               # prefer word boundary
      if lastSpace > 0:
          lines.push(remaining up to lastSpace + 1)     # slice at cluster boundary of that space
          remaining = remaining after that point
      else:
          lines.push(prefix)
          remaining = remaining after prefix            # remainder starts at a cluster boundary
  if remaining != '': lines.push(remaining)
  return lines
```

Word-boundary search happens inside the cell-bounded prefix (spaces are 1 cell, so `lastIndexOf(' ')` on the prefix is exact). For pure ASCII this is character-for-character identical to the current output.

### Decision 4: `wrapColorizedSegments` keeps its redistribute-by-offset structure

Flatten → `wrapLine` → re-split segments at wrapped-line boundaries using code-unit offsets, exactly as today. This stays correct because every `wrapLine` break point is a grapheme boundary, so segment slices never cut a cluster; the merging of adjacent same-color segments is unchanged. No structural rewrite — the existing color-preservation behavior (text-wrap spec: status-line gray prefix, JSON colorization) is preserved by construction.

### Decision 5: `truncateText` / `shiftText` become cell-budget wrappers

```
truncateText(value, maxWidth):
  if maxWidth <= 0: return ''
  if cellWidth(value) <= maxWidth: return value
  visible = sliceByCells(value, maxWidth - 1)           # reserve 1 cell for '…'
  return visible + '…'

shiftText(value, offset, maxWidth):
  if offset <= 0: return truncateText(value, maxWidth)
  shifted = sliceFromCells(value, offset, maxWidth)     # snap-to-cluster + budget in one walk
  return shifted == '' ? ' ' : truncateText(shifted, maxWidth)
```

`…` (U+2026) is ambiguous-width; `string-width` default counts it as 1 cell — accepted (see Non-Goals). Consumers (`RequestList`, `RequestDetailsView`, `StatusBar`, `ResponseView` shift/truncate transforms, `EditOverlay`) pick this up without edits. `truncateSegments`' existing behavior of flattening to the first segment's color is untouched.

`expandTabs` tracks the output cursor in cells (`cellWidth(result)` instead of `result.length`) so tab stops land on true visual columns; `edit.ts` visual-column math and `response-layout.ts` body-line tab expansion inherit the fix.

### Decision 6: Longest-line measurement in cells

`getMaxResponseLineWidth`, `getMaxRequestLineWidth`, `getMaxDetailsLineWidth` (`src/utils/scroll.ts`) compute `max(cellWidth(l))` over the same line sets they inspect today. The `max(0, maxLineWidth - contentWidth)` clamp formulas in the navigation reducer are unchanged — both operands are now cells, so the clamp is correct for wide-character content.

### Decision 7: Defensive render clamp in `renderVisualLine`

After transform, clamp the final segments before emitting `<Text>`:

```
renderVisualLine(segments, transform, key):
  ...existing transform application...
  finalSegments = clampSegmentsToWidth(finalSegments, transform.kind == 'pass'
                                        ? passBudget : transform.maxWidth)
```

`passBudget` is `contentWidth - 1` on search-marked rows (the marker glyph consumes a cell), `contentWidth` otherwise; implemented by threading the marker-adjusted budget from the existing marker branch in `ResponseView`. This is a no-op when wrap/truncate are correct; it exists so no future width regression can corrupt the whole layout (the same "guarantee width(line) ≤ columns before emitting" rule Ink's maintainers apply — ink#928).

Alternative considered: clamping inside `computeResponseLayout` — rejected; the marker adjustment is a render-time concern (search state), and the clamp guards the render boundary specifically.

## Risks / Trade-offs

- [Ambiguous-width glyphs (`…`, `⚠`, `►`) render wide on some East-Asian-locale terminals while `string-width` counts them narrow] → Accepted: identical to Ink's own internal accounting, so the app and Ink disagree nowhere; full per-terminal width tables are explicitly out of scope.
- [`Intl.Segmenter` + `stringWidth` are slower than `.length`] → All call sites are bounded (per-line, per-frame, typical bodies < a few thousand lines); `wrapLine`'s outer loop already re-measured via `.length` per iteration. If profiling later shows hot spots, memoize cluster widths per line — no API change needed.
- [Existing tests asserting unit-based offsets/widths on non-ASCII fixtures will fail] → Desired: those assertions encode the bug. Update them to cell-based expectations; ASCII-only assertions must pass unchanged (regression guard for the "ASCII identical" goal).
- [Wrapped visual-line counts for CJK bodies grow (lines budgeted at half their previous unit count)] → Visible-height math consumes the *count* of returned lines, so scrolling stays consistent; only more visual lines exist, which is the correct rendering.
- [`truncateSegments` color-flattening loses per-segment colors on nowrap truncation] → Pre-existing behavior, unchanged by this change; noted here so implementers don't "fix" it opportunistically.

## Migration Plan

Single PR, no state or config migration. Rollback = revert. After implementation: `npm ls string-width` must show exactly one copy (v8) in the tree; typecheck + lint + full test suite must pass; manual check with a long CJK/emoji JSON body toggling `w`, scrolling `h`/`l`, `$`/`0`, and search `/` on wide-character lines.
