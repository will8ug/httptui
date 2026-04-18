## ADDED Requirements

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
