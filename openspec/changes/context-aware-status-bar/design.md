# Context-Aware Status Bar - Design

## Context

The current `StatusBar` component displays static information: keyboard shortcuts on the left, file name + selected request index on the right. When users tab to the response or details panels, the status bar doesn't reflect the context of the focused panel. Meanwhile, `RequestDetailsView` has an inline scroll indicator (`↕ X/Y lines`) that duplicates what the status bar could provide. This design proposes moving all panel-specific status into the global status bar, making it context-aware.

## Goals / Non-Goals

**Goals:**
- Status bar right-side text changes based on `focusedPanel`.
- Keep file name always visible on the right side.
- Remove redundant inline scroll indicator from `RequestDetailsView`.
- Avoid duplicating request resolution logic.

**Non-Goals:**
- Changing the status bar left side (shortcuts).
- Adding request list scroll position (keep it simple).
- Changing any keyboard shortcuts or navigation logic.
- Modifying the reducer or state shape.

## Decisions

### Decision 1: Status Bar Receives Panel-Specific Data via Props

**Rationale:** `StatusBar` is a presentational component. It shouldn't compute scroll totals or resolve requests — those are expensive and belong in `App.tsx` where the data is already available or easily computed.

**Props to add:**
```typescript
interface StatusBarProps {
  filePath: string;
  requestCount: number;
  selectedIndex: number;
  insecure: boolean;
  reloadMessage: string | null;
  focusedPanel: FocusedPanel;
  // Details panel state
  detailsScrollOffset: number;
  detailsTotalLines: number;
  // Response panel state
  responseScrollOffset: number;
  responseTotalLines: number;
  hasResponse: boolean;
}
```

### Decision 2: File Name Is Always Visible

**Rationale:** The file name is critical context. Losing it when tabbing to another panel would be disorienting.

**Format:**
```
api.http | 1/10
api.http | ↕ 3/25 lines
api.http | ↕ 12/45 lines
```

### Decision 3: Extract `resolveRequestDetails()` Utility

**Rationale:** Both `App.tsx` and `RequestDetailsView.tsx` resolve variables. Extracting this avoids duplication and makes testing easier.

**Location:** `src/utils/request.ts` (existing file)

```typescript
export interface ResolvedRequestDetails {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
  totalContentLines: number;
}

export function resolveRequestDetails(
  request: ParsedRequest,
  variables: FileVariable[],
): ResolvedRequestDetails;
```

### Decision 4: Remove Inline Scroll Indicator from RequestDetailsView

**Rationale:** Once the status bar shows this info, the inline indicator is redundant. Removing it simplifies `RequestDetailsView` and reduces visual clutter.

**Lines to remove:** Lines 100-106 in `RequestDetailsView.tsx`.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Status bar text becomes too long for narrow terminals | Truncate from the left (shortcuts side) if needed. The right side (file + status) is highest priority. |
| Users miss the inline scroll indicator | The status bar is always visible at the bottom — arguably more noticeable than an inline indicator inside a panel. |
| Extra computation in `App.tsx` | Both `detailsTotalLines` and `responseTotalLines` use existing, fast utility functions. No significant performance impact. |

## Migration Plan

1. Create `resolveRequestDetails()` utility
2. Update `StatusBar` component with new props and context-aware logic
3. Update `App.tsx` to compute and pass new props
4. Remove inline indicator from `RequestDetailsView`
5. Verify with `npm run build` and `npm test`

## Open Questions

- Should we show `↕` symbol for all panels, or only when scrolled? (Decision: only when `scrollOffset > 0` or `totalLines > visibleHeight`)
