## MODIFIED Requirements

### Requirement: Centralized shortcut registry
The system SHALL define all keyboard shortcuts in a single source of truth at `src/core/shortcuts.ts`. Each shortcut SHALL have a `key` (display key), `label` (short label for status bar), `description` (full description for help overlay), `showInBar` (boolean controlling status bar visibility), and `showInHelp` (boolean controlling help overlay visibility) field. The registry SHALL include a combined entry with key `h/j/k/l`, label `Nav`, and `showInBar: true` that covers both vertical navigation and horizontal scrolling. The individual entries for `← / h` and `→ / l` with `showInBar: false` SHALL remain for the help overlay. The registry SHALL include an entry for the wrap toggle shortcut with key `w`, label `Wrap`, description `Toggle text wrapping in response panel`, `showInBar: false`, and `showInHelp: true`. The registry SHALL include entries for the three search-related shortcuts: `/` (start search), `n` (next match), and `N` (previous match), all with `showInBar: false` and `showInHelp: true`.

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

#### Scenario: Search shortcut in registry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with key `/`, description `Search response body`, `showInBar: false`, and `showInHelp: true`

#### Scenario: Next match shortcut in registry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with key `n`, description `Go to next search match`, `showInBar: false`, and `showInHelp: true`

#### Scenario: Previous match shortcut in registry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with key `N`, description `Go to previous search match`, `showInBar: false`, and `showInHelp: true`
