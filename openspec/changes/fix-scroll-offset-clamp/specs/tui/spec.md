## ADDED Requirements

### Requirement: Vertical scroll offset upper-bound clamping
All vertical scroll offsets (`responseScrollOffset`, `detailsScrollOffset`) SHALL be clamped to `[0, maxOffset]` within the reducer. The `maxOffset` value SHALL be computed in the component layer (where terminal dimensions and content line counts are available) and passed as a payload field on the `SCROLL` action. The reducer SHALL apply `Math.min(Math.max(0, offset + delta), maxOffset)` clamping, consistent with the existing `SCROLL_HORIZONTAL` pattern that uses `Math.min(Math.max(0, ...), maxOffset)`.

When `maxOffset` is not provided in the action (e.g., in tests), the reducer SHALL fall back to `Math.max(0, offset + delta)` to maintain backward compatibility.

#### Scenario: Response scroll offset clamped at bottom
- **WHEN** `focusedPanel` is `response` and `responseScrollOffset` is at `maxOffset` and the user presses `j` or `↓`
- **THEN** `responseScrollOffset` SHALL remain at `maxOffset` (it SHALL NOT increase beyond the boundary)

#### Scenario: Immediate upward scroll in response panel after bottoming out
- **WHEN** `focusedPanel` is `response` and `responseScrollOffset` is at `maxOffset`, the user presses `j` multiple times, then presses `k`
- **THEN** `responseScrollOffset` SHALL decrease by 1 from `maxOffset` immediately (no invisible offset accumulation)

#### Scenario: SCROLL action without maxOffset falls back to lower-bound clamping
- **WHEN** a `SCROLL` action is dispatched without a `maxOffset` field
- **THEN** the reducer SHALL apply only `Math.max(0, offset + delta)` clamping (preserving current behavior for backward compatibility)

## MODIFIED Requirements

### Requirement: Horizontal Scroll States
Both panels track a `horizontalOffset` (default `0`) that shifts content left by that many characters. Vertical scroll offsets (`responseScrollOffset`, `detailsScrollOffset`) SHALL also be clamped to an upper bound computed from content lines and visible height, using the same two-way clamp pattern applied to horizontal offsets. This replaces the previous behavior where vertical offsets were only clamped to the lower bound (`≥ 0`).

#### Scenario: Vertical offset matches horizontal offset clamping pattern
- **WHEN** a `SCROLL` action is dispatched with `maxOffset` for a scrollable panel
- **THEN** the resulting offset SHALL be `Math.min(Math.max(0, offset + delta), maxOffset)`, matching the `SCROLL_HORIZONTAL` clamping pattern