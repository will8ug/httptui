## ADDED Requirements

### Requirement: Raw mode toggle

The TUI SHALL support a `rawMode` boolean in `AppState` (default: `false`). When `rawMode` is `true`, the response body SHALL be rendered as plain text exactly as received from the server, without JSON pretty-printing or syntax colorization. Non-JSON responses SHALL render identically regardless of `rawMode`.

#### Scenario: Toggling raw mode on
- **WHEN** the user presses `r` while in normal mode (no overlay active)
- **THEN** the application SHALL set `rawMode` to `true` and re-render the response body as plain unformatted text

#### Scenario: Toggling raw mode off
- **WHEN** the user presses `r` while `rawMode` is `true`
- **THEN** the application SHALL set `rawMode` to `false` and re-render the response body with JSON pretty-printing and colorization (for JSON responses)

#### Scenario: Raw mode panel title indicator
- **WHEN** `rawMode` is `true`
- **THEN** the response panel title SHALL display `Response [raw]` instead of `Response`

#### Scenario: Raw mode combined with wrap mode
- **WHEN** both `rawMode` and `wrapMode === 'wrap'` are active
- **THEN** the response panel title SHALL display `Response [raw] [wrap]`

#### Scenario: Raw mode with non-JSON response
- **WHEN** `rawMode` is `true` and the response body is not valid JSON
- **THEN** the response body SHALL render identically to when `rawMode` is `false` (plain text as-is)

## MODIFIED Requirements

### Requirement: Keyboard Shortcuts

The TUI SHALL define a `SHORTCUTS` array listing all keyboard shortcuts. The `r` key SHALL be included with `showInBar: false` and `showInHelp: true`, labeled "Raw" with description "Toggle raw response mode (no JSON formatting)".

#### Scenario: Shortcuts list includes r
- **WHEN** the `SHORTCUTS` array is rendered in the help overlay
- **THEN** the `r` key SHALL appear in the list with description "Toggle raw response mode (no JSON formatting)"

#### Scenario: Status bar does not show r
- **WHEN** the status bar renders shortcut hints
- **THEN** the `r` key SHALL NOT appear in the status bar (only in help overlay)
