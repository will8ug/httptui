# Spec: Shortcuts

## Purpose

Centralized keyboard shortcut registry that serves as the single source of truth for all shortcut definitions, consumed by both StatusBar and HelpOverlay.
## Requirements
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

### Requirement: Status bar shows bar-visible shortcuts
The status bar SHALL display at most 6 shortcuts where `showInBar` is `true`. New shortcuts that are not essential for the status bar SHOULD use `showInBar: false` and `showInHelp: true` so they appear only in the help overlay. The current 6 bar-visible shortcuts are: `[Enter] Send`, `[h/j/k/l] Nav`, `[Tab] Panel`, `[v] Verbose`, `[q] Quit`, `[?] Help` — in that order.

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

### Requirement: Help overlay renders from shared data
The HelpOverlay SHALL render all shortcuts from the centralized `SHORTCUTS` array where `showInHelp` is `true`, displaying each shortcut's `key` (padded to 8 characters) and `description`.

#### Scenario: Help overlay shows all shortcuts
- **WHEN** the help overlay is visible
- **THEN** it SHALL display all entries from `SHORTCUTS` where `showInHelp === true`, including those with `showInBar: false`

#### Scenario: Help overlay format
- **WHEN** a shortcut is rendered in the help overlay
- **THEN** the key SHALL be displayed in yellow, padded to 8 characters, followed by the description in white

#### Scenario: Wrap shortcut in help overlay
- **WHEN** the help overlay is visible
- **THEN** the `w` key entry SHALL appear with description `Toggle text wrapping in response panel`

### Requirement: No hardcoded shortcut strings
Neither StatusBar.tsx nor HelpOverlay.tsx SHALL contain hardcoded shortcut strings or arrays. All shortcut data SHALL come from the centralized `SHORTCUTS` export in `src/core/shortcuts.ts`.

#### Scenario: Removing hardcoded status bar string
- **WHEN** StatusBar.tsx is rendered
- **THEN** it SHALL NOT contain a hardcoded string like `'[Enter] Send  [j/k] Nav ...'`

#### Scenario: Removing hardcoded HelpOverlay SHORTCUTS array
- **WHEN** HelpOverlay.tsx is rendered
- **THEN** it SHALL NOT contain a local `SHORTCUTS` constant with shortcut definitions

### Requirement: Edge-jump shortcut entries in registry
The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include entries for the four edge-jump shortcuts. Each entry SHALL conform to the existing `Shortcut` interface (`key`, `label`, `description`, `showInBar`, `showInHelp`). All four entries SHALL use `showInBar: false` and `showInHelp: true`.

The required entries are:

- `key: 'g'`, `description: 'Jump to top of focused panel'`
- `key: 'G'`, `description: 'Jump to bottom of focused panel'`
- `key: '0'`, `description: 'Jump to horizontal start of focused panel'`
- `key: '$'`, `description: 'Jump to horizontal end of focused panel'`

The `label` field for each entry MAY be an empty string (consistent with existing help-only entries like `← / h`, `→ / l`, `o`, `R`, `Escape`).

#### Scenario: Registry contains g entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'g'`, `description` equal to `'Jump to top of focused panel'`, `showInBar` equal to `false`, and `showInHelp` equal to `true`

#### Scenario: Registry contains G entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'G'`, `description` equal to `'Jump to bottom of focused panel'`, `showInBar` equal to `false`, and `showInHelp` equal to `true`

#### Scenario: Registry contains 0 entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'0'`, `description` equal to `'Jump to horizontal start of focused panel'`, `showInBar` equal to `false`, and `showInHelp` equal to `true`

#### Scenario: Registry contains $ entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'$'`, `description` equal to `'Jump to horizontal end of focused panel'`, `showInBar` equal to `false`, and `showInHelp` equal to `true`

### Requirement: Edge-jump shortcuts do not appear in status bar
The four edge-jump entries SHALL NOT be rendered in the status bar. The status bar SHALL continue to show only entries where `showInBar` is `true`, preserving the existing 6-item budget documented in the existing "Status bar shows bar-visible shortcuts" requirement.

#### Scenario: Status bar excludes edge-jump shortcuts
- **WHEN** the StatusBar component renders
- **THEN** no entry for `g`, `G`, `0`, or `$` SHALL appear in the status bar output
- **AND** the six existing bar-visible shortcuts (`[Enter] Send`, `[h/j/k/l] Nav`, `[Tab] Panel`, `[v] Verbose`, `[q] Quit`, `[?] Help`) SHALL remain in place

### Requirement: Edge-jump shortcuts appear in help overlay
The four edge-jump entries SHALL be rendered in the help overlay alongside the other help-only shortcuts, using the same key/description formatting (key in yellow, padded to 8 characters, followed by description in white).

#### Scenario: Help overlay includes all four edge-jump shortcuts
- **WHEN** the help overlay is visible
- **THEN** entries for `g`, `G`, `0`, and `$` SHALL each appear with their respective descriptions

