## MODIFIED Requirements

### Requirement: Centralized shortcut registry
The system SHALL define all keyboard shortcuts in a single source of truth at `src/core/shortcuts.ts`. Each shortcut SHALL have a `key` (display key), `label` (short label for status bar), `description` (full description for help overlay), and `showInBar` (boolean controlling status bar visibility) field. The registry SHALL include a combined entry with key `h/j/k/l`, label `Nav`, and `showInBar: true` that covers both vertical navigation and horizontal scrolling. The individual entries for `← / h` and `→ / l` with `showInBar: false` SHALL remain for the help overlay.

#### Scenario: All shortcuts are defined in one place
- **WHEN** a developer needs to add, remove, or modify a keyboard shortcut
- **THEN** they SHALL update only `src/core/shortcuts.ts` and both StatusBar and HelpOverlay SHALL reflect the change

#### Scenario: Shortcut type safety
- **WHEN** the `SHORTCUTS` array is imported
- **THEN** each entry SHALL conform to the `Shortcut` interface with `key: string`, `label: string`, `description: string`, and `showInBar: boolean`

#### Scenario: Combined navigation shortcut in registry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain a single entry with key `h/j/k/l`, label `Nav`, description `Navigate requests and scroll panels`, and `showInBar: true`
- **AND** it SHALL NOT contain separate `showInBar: true` entries for `j/k` (Nav) or `←/→` (Scroll)

### Requirement: Status bar shows bar-visible shortcuts
The status bar SHALL display all shortcuts where `showInBar` is `true`: `[Enter] Send`, `[h/j/k/l] Nav`, `[Tab] Panel`, `[v] Verbose`, `[q] Quit`, `[?] Help` — in that order.

#### Scenario: Status bar rendering from data source
- **WHEN** the StatusBar component renders
- **THEN** it SHALL filter shortcuts where `showInBar === true` and render them as `[key] label` pairs separated by two spaces, in array order

#### Scenario: Status bar includes help shortcut
- **WHEN** the status bar is rendered
- **THEN** `[?] Help` SHALL appear as the last (rightmost) item

#### Scenario: Merged navigation entry replaces separate entries
- **WHEN** the status bar is rendered
- **THEN** `[h/j/k/l] Nav` SHALL appear where `[j/k] Nav` previously appeared
- **AND** `[←/→] Scroll` SHALL NOT appear in the status bar

#### Scenario: Truncation preserves existing behavior
- **WHEN** the terminal width is too narrow to show all shortcuts
- **THEN** the status bar SHALL truncate the entire shortcut string from the right using the existing `truncateText` function
