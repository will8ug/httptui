## Context

The Request Details panel uses a broken horizontal scrolling implementation. When `horizontalOffset > 0`, the component applies `marginLeft={-horizontalOffset}` to an inner `<Box>`, which physically shifts the box leftward beyond the parent panel's bounds. Ink (the React CLI renderer) does not provide CSS-like overflow clipping, so content simply renders wherever the cursor moves — bleeding into the adjacent Requests sidebar.

Both `RequestList` and `ResponseView` panels correctly handle horizontal scrolling by slicing text strings in JavaScript and truncating to the available content width, keeping their Box components stationary.

## Goals / Non-Goals

**Goals:**
- Fix the visual overflow bug in Request Details panel during horizontal scroll
- Align Request Details horizontal scrolling behavior with RequestList and ResponseView patterns
- Preserve all existing user-facing behavior (keyboard shortcuts, scroll offsets, focus handling)

**Non-Goals:**
- No changes to vertical scrolling behavior
- No changes to panel focus cycling or toggle behavior
- No changes to the reducer's scroll offset calculations
- No new dependencies

## Decisions

**Decision: Use content-slicing instead of negative margin**
- **Rationale**: Negative margin is the root cause. It moves the Box physically left, and Ink has no overflow clipping. Content-slicing (`text.slice(offset)`) followed by truncation keeps all rendered text within the Box bounds.
- **Alternatives considered**: 
  - Add overflow clipping to Ink Box — not possible, Ink doesn't support it
  - Use a fixed-width wrapper — would still show truncated text at wrong position
  - Reduce max horizontal offset — band-aid, doesn't fix the fundamental issue

**Decision: Extract a reusable text-slicing helper**
- **Rationale**: Both `RequestList.tsx` and `ResponseView.tsx` implement similar slicing logic inline. Extracting a small helper in `src/utils/text.ts` reduces duplication and makes `RequestDetailsView.tsx` consistent.
- **Function signature**: `shiftText(text: string, offset: number, maxWidth: number): string`

**Decision: Compute content width from existing layout utilities**
- **Rationale**: `getResponseContentWidth()` already exists and computes the right-side panel content width correctly. `RequestDetailsView` lives inside the right column, so it should use the same width calculation.

## Risks / Trade-offs

**Risk**: Long lines with ANSI color codes might be miscounted when slicing
- **Mitigation**: The request details panel currently does not apply ANSI color codes to the URL or body text (only method has color). Headers are plain text. So simple string slicing is safe.

**Risk**: Very wide multi-line body content might still feel cramped after truncation
- **Mitigation**: This is existing behavior for ResponseView and RequestList. Users already accept truncated views; they can scroll horizontally to reveal hidden content.

## Migration Plan

No migration needed. This is a pure bugfix with no breaking changes.

## Open Questions

None.
