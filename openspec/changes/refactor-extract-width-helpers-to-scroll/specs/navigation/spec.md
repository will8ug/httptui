## MODIFIED Requirements

### Requirement: JUMP_HORIZONTAL action
The system SHALL define a `JUMP_HORIZONTAL` action type in the `Action` union with `direction: 'start' | 'end'` and an optional `columns: number` field. The reducer SHALL apply the action based on the currently focused panel:

- When `focusedPanel === 'response'` and `wrapMode === 'wrap'`: return state unchanged (mirrors the existing `SCROLL_HORIZONTAL` guard).
- When `focusedPanel === 'requests'` and `direction === 'start'`: set `requestHorizontalOffset` to `0`.
- When `focusedPanel === 'requests'` and `direction === 'end'`: set `requestHorizontalOffset` to `max(0, getMaxRequestLineWidth({ requests, variables, baseDir }) - getRequestContentWidth(columns ?? 80))`.
- When `focusedPanel === 'details'` and `direction === 'start'`: set `detailsHorizontalOffset` to `0`.
- When `focusedPanel === 'details'` and `direction === 'end'`: set `detailsHorizontalOffset` to `max(0, getMaxDetailsLineWidth({ request, variables }) - getResponseContentWidth(columns ?? 80))`.
- When `focusedPanel === 'response'` (and wrap mode is NOT `'wrap'`) and `direction === 'start'`: set `responseHorizontalOffset` to `0`.
- When `focusedPanel === 'response'` (and wrap mode is NOT `'wrap'`) and `direction === 'end'`: set `responseHorizontalOffset` to `max(0, getMaxResponseLineWidth({ response, verbose, rawMode }) - getResponseContentWidth(columns ?? 80))`.

The `getMaxRequestLineWidth`, `getMaxDetailsLineWidth`, and `getMaxResponseLineWidth` helpers SHALL be imported from `src/utils/scroll.ts` (not `src/core/reducer.ts`) and SHALL accept option bags, not `AppState` directly. `requests`, `variables`, and `baseDir` SHALL be derived from `state.requests`, `state.variables`, and `dirname(state.filePath)` respectively; `request`, `variables` from `state.requests[state.selectedIndex]` and `state.variables`; `response`, `verbose`, `rawMode` from the corresponding `state` fields.

No other state fields SHALL be modified by `JUMP_HORIZONTAL`.

#### Scenario: Jump to horizontal start of requests panel
- **WHEN** `focusedPanel` is `requests`, `requestHorizontalOffset` is `12`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of requests panel
- **WHEN** `focusedPanel` is `requests`, `requests` contain at least one entry whose formatted line width exceeds `getRequestContentWidth(columns)`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `max(0, getMaxRequestLineWidth({ requests, variables, baseDir }) - getRequestContentWidth(columns))`

#### Scenario: Jump to horizontal start of details panel
- **WHEN** `focusedPanel` is `details`, `detailsHorizontalOffset` is greater than `0`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `detailsHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of details panel
- **WHEN** `focusedPanel` is `details` and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `detailsHorizontalOffset` SHALL become `max(0, getMaxDetailsLineWidth({ request, variables }) - getResponseContentWidth(columns))`

#### Scenario: Jump to horizontal start of response panel
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'nowrap'`, `responseHorizontalOffset` is greater than `0`, and a `JUMP_HORIZONTAL { direction: 'start' }` action is dispatched
- **THEN** `responseHorizontalOffset` SHALL become `0`

#### Scenario: Jump to horizontal end of response panel
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'nowrap'`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `responseHorizontalOffset` SHALL become `max(0, getMaxResponseLineWidth({ response, verbose, rawMode }) - getResponseContentWidth(columns))`

#### Scenario: Jump to horizontal edge is no-op when response wrap mode is active
- **WHEN** `focusedPanel` is `response`, `wrapMode` is `'wrap'`, and either `JUMP_HORIZONTAL { direction: 'start' }` or `JUMP_HORIZONTAL { direction: 'end' }` is dispatched
- **THEN** the reducer SHALL return state unchanged

#### Scenario: Default columns value
- **WHEN** `JUMP_HORIZONTAL { direction: 'end' }` is dispatched without a `columns` field
- **THEN** the reducer SHALL default `columns` to `80` for backward compatibility and testability

#### Scenario: Jump to horizontal end clamped to zero when content fits
- **WHEN** `focusedPanel` is `requests` and `getMaxRequestLineWidth({ requests, variables, baseDir })` is less than or equal to `getRequestContentWidth(columns)`, and a `JUMP_HORIZONTAL { direction: 'end', columns }` action is dispatched
- **THEN** `requestHorizontalOffset` SHALL become `0` (clamped lower bound)