---
status: accepted
---

# Terminal geometry lives in AppState

Terminal size is read from Ink's `useStdout()` per render by eight components, yet scroll bounds are computed in the reducer, so geometry also has to live in state. We put it there via a `SET_GEOMETRY` action rather than threading bound values through Action payloads.

## Context

Before this decision, scroll bounds were computed in input handlers and passed inside Action payloads (`SCROLL.maxOffset`, `JUMP_VERTICAL.maxOffset`, `EDIT_KEY` carrying required `visibleHeight`/`visibleWidth`), while `reducers/navigation.ts` re-derived horizontal bounds itself with a `columns ?? 80` default, `JUMP_VERTICAL` silently no-oped when `maxOffset` was missing, and `SCROLL` clamped unbounded when it was. The response viewport deepening requires the reducer to compute bounds from real geometry, and a reducer cannot read `useStdout()`.

## Decision

- `AppState` carries terminal geometry (`rows`, `columns`), set by a single `SET_GEOMETRY` dispatch from one `useEffect` in `App.tsx` covering both mount and resize.
- Reducers compute every scroll bound themselves through the response viewport; Action payloads carry intent only (direction, index, query), never bounds.
- A resize re-clamps scroll offsets immediately; previously offsets stayed stale until the next keypress.

## Consequences

- Positive: the `?? 80` fake default, the silent `JUMP_VERTICAL` no-ops, and the unbounded `SCROLL` clamp hazard are deleted; input-handler interfaces shed their layout-metric parameters.
- Trade-off: terminal size is now duplicated between Ink's render context and state, and the first render runs on default dimensions until the initial `SET_GEOMETRY` lands.
