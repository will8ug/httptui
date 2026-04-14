## MODIFIED Requirements

### Requirement: Centralized shortcut registry
The system SHALL define all keyboard shortcuts in a single source of truth at `src/core/shortcuts.ts`. Each shortcut SHALL have a `key` (display key), `label` (short label for status bar), `description` (full description for help overlay), `showInBar` (boolean controlling status bar visibility), and `showInHelp` (boolean controlling help overlay visibility) field. The registry SHALL include a combined entry with key `h/j/k/l`, label `Nav`, and `showInBar: true` that covers both vertical navigation and horizontal scrolling. The individual entries for `← / h` and `→ / l` with `showInBar: false` SHALL remain for the help overlay. The registry SHALL include an entry for the wrap toggle shortcut with key `w`, label `Wrap`, description `Toggle text wrapping in response panel`, `showInBar: false`, and `showInHelp: true`. The wrap toggle uses `showInBar: false` because the status bar is limited to 6 bar-visible shortcuts and wrap is a secondary action best discovered via the help overlay.

#### Scenario: All shortcuts are defined in one place
- **WHEN** a developer needs to add, remove, or modify a keyboard shortcut
- **THEN** they SHALL update only `src/core/shortcuts.ts` and both StatusBar and HelpOverlay SHALL reflect the change

#### Scenario: Shortcut type safety
- **WHEN** the `SHORTCUTS` array is imported
- **THEN** each entry SHALL conform to the `Shortcut` interface with `key: string`, `label: string`, `description: string`, `showInBar: boolean`, and `showInHelp: boolean`

#### Scenario: Combined navigation shortcut in registry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain a single entry with key `h/j/k/l`, label `Nav`, description `Navigate requests and scroll panels`, and `showInBar: true`
- **AND** it SHALL NOT contain separate `showInBar: true` entries for `j/k` (Nav) or `←/→` (Scroll)

#### Scenario: Wrap toggle shortcut in registry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with key `w`, label `Wrap`, description `Toggle text wrapping in response panel`, `showInBar: false`, and `showInHelp: true`

### Requirement: Status bar shows bar-visible shortcuts
The status bar SHALL display all shortcuts where `showInBar` is `true`: `[Enter] Send`, `[h/j/k/l] Nav`, `[Tab] Panel`, `[v] Verbose`, `[q] Quit`, `[?] Help` — in that order. (The `w` Wrap shortcut has `showInBar: false` and does not appear in the status bar.)

#### Scenario: Status bar rendering from data source
- **WHEN** the StatusBar component renders
- **THEN** it SHALL filter shortcuts where `showInBar === true` and render them as `[key] label` pairs separated by two spaces, in array order

#### Scenario: Status bar does not include wrap shortcut
- **WHEN** the status bar is rendered
- **THEN** `[w] Wrap` SHALL NOT appear in the status bar (it has `showInBar: false`)

#### Scenario: Status bar includes help shortcut
- **WHEN** the status bar is rendered
- **THEN** `[?] Help` SHALL appear as the last (rightmost) item

#### Scenario: Truncation preserves existing behavior
- **WHEN** the terminal width is too narrow to show all shortcuts
- **THEN** the status bar SHALL truncate the entire shortcut string from the right using the existing `truncateText` function

### Requirement: Help overlay renders from shared data
The HelpOverlay SHALL render all shortcuts from the centralized `SHORTCUTS` array, displaying each shortcut's `key` (padded to 8 characters) and `description`. The help overlay SHALL include the wrap toggle shortcut `w` with description `Toggle text wrapping in response panel`.

#### Scenario: Help overlay shows all shortcuts
- **WHEN** the help overlay is visible
- **THEN** it SHALL display all entries from `SHORTCUTS`, including those with `showInBar: false`

#### Scenario: Help overlay format
- **WHEN** a shortcut is rendered in the help overlay
- **THEN** the key SHALL be displayed in yellow, padded to 8 characters, followed by the description in white

#### Scenario: Wrap shortcut in help overlay
- **WHEN** the help overlay is visible
- **THEN** the `w` key entry SHALL appear with description `Toggle text wrapping in response panel`