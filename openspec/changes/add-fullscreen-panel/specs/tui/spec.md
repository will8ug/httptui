# Spec: TUI Interface (Delta)

## MODIFIED Requirements

### Requirement: Fullscreen panel layout
When `maximizedPanel` is not `null`, the TUI SHALL render only the panel identified by `maximizedPanel` at full terminal width and full content height (`rows - 1`), with the status bar remaining at the bottom. All other panels SHALL NOT be rendered. The `Layout` component SHALL accept a `maximizedPanel` prop of type `FocusedPanel | null` and conditionally render the appropriate layout:

- When `maximizedPanel` is `'requests'`: render `RequestList` at full width/height with `focused={true}`, plus `StatusBar` at the bottom
- When `maximizedPanel` is `'response'`: render `ResponseView` at full width/height with `focused={true}`, plus `StatusBar` at the bottom
- When `maximizedPanel` is `'details'`: render `RequestDetailsView` at full width/height with `focused={true}`, plus `StatusBar` at the bottom
- When `maximizedPanel` is `null`: render the normal split-panel layout (existing behavior)

In fullscreen mode, the `RequestList` component SHALL receive `width="100%"` instead of the constrained left panel width, and `RequestList` SHALL use `stdout.columns` as its content width. The `ResponseView` component SHALL receive the full terminal width for content calculations. The `RequestDetailsView` component SHALL receive a `maxHeight` equal to the available content height minus border chrome.

#### Scenario: Fullscreen response panel layout
- **WHEN** `maximizedPanel` is `'response'` and the terminal is 80 columns by 24 rows
- **THEN** the `ResponseView` SHALL be rendered at 80 columns wide and 23 rows tall (24 rows minus 1 for status bar), and no `RequestList` or `RequestDetailsView` SHALL be rendered

#### Scenario: Fullscreen requests panel layout
- **WHEN** `maximizedPanel` is `'requests'` and the terminal is 80 columns by 24 rows
- **THEN** the `RequestList` SHALL be rendered at 80 columns wide and 23 rows tall, and no `ResponseView` or `RequestDetailsView` SHALL be rendered

#### Scenario: Fullscreen details panel layout
- **WHEN** `maximizedPanel` is `'details'` and the terminal is 80 columns by 24 rows
- **THEN** the `RequestDetailsView` SHALL be rendered at 80 columns wide and 23 rows tall (minus border chrome), and no `RequestList` or `ResponseView` SHALL be rendered

#### Scenario: Normal layout when not fullscreen
- **WHEN** `maximizedPanel` is `null`
- **THEN** the `Layout` SHALL render the normal split-panel layout with the left panel (30% width) and right panel (70% width), exactly as before

## ADDED Requirements

### Requirement: App passes maximizedPanel to Layout
The `App` component SHALL pass `state.maximizedPanel` as a prop named `maximizedPanel` to the `Layout` component. The `App` component SHALL also pass `state.focusedPanel` (when `maximizedPanel` is `null`) or `state.maximizedPanel` (when `maximizedPanel` is not `null`) as the focused panel indicator for border highlighting in fullscreen mode.

#### Scenario: App passes maximizedPanel to Layout
- **WHEN** `state.maximizedPanel` is `'response'`
- **THEN** the `Layout` component SHALL receive `maximizedPanel="response"` as a prop

#### Scenario: App passes null maximizedPanel to Layout in normal mode
- **WHEN** `state.maximizedPanel` is `null`
- **THEN** the `Layout` component SHALL receive `maximizedPanel={null}` as a prop