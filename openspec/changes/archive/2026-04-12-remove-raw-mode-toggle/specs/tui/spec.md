## REMOVED Requirements

### Requirement: Raw mode toggle
**Reason**: Raw mode provided no visible user value — toggling `r` produced no visible change for most API responses (JSON is already pretty-printed by servers), and there was no indicator that raw mode was active.
**Migration**: Response body rendering uses the default behavior (pretty-print JSON, pass through non-JSON). No user action needed.

#### Scenario: Toggling raw mode
- **WHEN** the user pressed `r`
- **THEN** the application toggled `rawMode` state and rendered the response body without JSON formatting

## MODIFIED Requirements

### Requirement: Keyboard Shortcuts

The TUI SHALL define a `SHORTCUTS` array listing all keyboard shortcuts. The `r` key SHALL NOT be included in the list. Response body rendering SHALL preserve the existing default behavior: attempt JSON pretty-printing, fall back to displaying as-is for non-JSON content.

#### Scenario: Shortcuts list does not include r
- **WHEN** the `SHORTCUTS` array is rendered in the help overlay
- **THEN** the `r` key SHALL NOT appear in the list

#### Scenario: Response body formatting
- **WHEN** a JSON response body is displayed
- **THEN** it SHALL be pretty-printed with `JSON.stringify(parsed, null, 2)`

#### Scenario: Non-JSON response body formatting
- **WHEN** a non-JSON response body is displayed
- **THEN** it SHALL be displayed as-is