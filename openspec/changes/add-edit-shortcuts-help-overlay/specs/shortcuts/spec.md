## ADDED Requirements

### Requirement: Edit shortcut group in registry
The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an `edit` group with three entries corresponding to the existing body-editor keybindings: `Ctrl+S` (save and close editor), `Ctrl+A` (jump to start of line), and `Ctrl+E` (jump to end of line). Each entry SHALL have `showInBar: false`, `showInHelp: true`, and `group: 'edit'`. The `ShortcutGroup` union and `SHORTCUT_GROUP_LABELS` SHALL include `edit` with the label `'Edit'`.

#### Scenario: Registry contains Ctrl+S entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'Ctrl+S'`, `description` equal to `'Save and close editor'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'edit'`

#### Scenario: Registry contains Ctrl+A entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'Ctrl+A'`, `description` equal to `'Jump to start of line'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'edit'`

#### Scenario: Registry contains Ctrl+E entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'Ctrl+E'`, `description` equal to `'Jump to end of line'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'edit'`

#### Scenario: Edit group label defined
- **WHEN** `SHORTCUT_GROUP_LABELS` is inspected
- **THEN** it SHALL contain an `edit` key with the value `'Edit'`

### Requirement: Edit shortcuts do not appear in status bar
The three edit-group entries SHALL NOT be rendered in the status bar. The status bar SHALL continue to show only entries where `showInBar` is `true`, preserving the existing 6-item budget.

#### Scenario: Status bar excludes edit shortcuts
- **WHEN** the StatusBar component renders
- **THEN** no entry for `Ctrl+S`, `Ctrl+A`, or `Ctrl+E` SHALL appear in the status bar output
- **AND** the six existing bar-visible shortcuts (`[Enter] Send`, `[h/j/k/l] Nav`, `[Tab] Panel`, `[v] Verbose`, `[q] Quit`, `[?] Help`) SHALL remain in place

## MODIFIED Requirements

### Requirement: Help overlay renders shortcut groups in two columns

The HelpOverlay component SHALL render shortcut groups in a two-column layout. The left column SHALL contain the "General", "Navigation", and "Edit" groups (in that order). The right column SHALL contain the "Request", "Display", and "Search" groups (in that order).

#### Scenario: Two-column layout renders with correct group placement

- **WHEN** the help overlay is visible
- **THEN** the left column displays the "General" group header followed by its shortcuts, then the "Navigation" group header followed by its shortcuts, then the "Edit" group header followed by its shortcuts
- **AND** the right column displays the "Request" group header followed by its shortcuts, then the "Display" group header followed by its shortcuts, then the "Search" group header followed by its shortcuts

#### Scenario: Columns render side-by-side reducing overall height

- **WHEN** the help overlay is visible
- **THEN** the rendered height of the shortcut section SHALL be approximately the height of the taller column rather than the sum of all groups

### Requirement: Column group assignment is defined as a data constant

A `HELP_COLUMN_GROUPS` constant SHALL be exported from `src/core/shortcuts.ts` defining which shortcut groups belong to each column. The constant SHALL be an array of arrays of `ShortcutGroup` values.

#### Scenario: Column assignment constant structure

- **WHEN** a developer imports `HELP_COLUMN_GROUPS` from `src/core/shortcuts.ts`
- **THEN** it SHALL be a readonly array with exactly 2 elements
- **AND** the first element SHALL be `['general', 'navigation', 'edit']`
- **AND** the second element SHALL be `['request', 'display', 'search']`
