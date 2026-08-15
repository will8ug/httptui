## ADDED Requirements

### Requirement: External editor handoff shortcut in registry

The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an entry for the external editor handoff command with the following properties: `key: 'Ctrl+G'`, `label: ''` (empty, consistent with the other `edit`-group entries), `description: 'Open source file in $EDITOR'`, `showInBar: false`, `showInHelp: true`, and `group: 'edit'`.

#### Scenario: Registry contains the external editor entry

- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain exactly one entry whose `key` is `Ctrl+G`, with `group` set to `edit` and `showInHelp` set to `true`

#### Scenario: External editor shortcut not in status bar

- **WHEN** the status bar is rendered
- **THEN** the `Ctrl+G` shortcut SHALL NOT appear, because its `showInBar` is `false`

#### Scenario: External editor shortcut in help overlay

- **WHEN** the help overlay is displayed
- **THEN** the `Ctrl+G` shortcut SHALL appear in the Edit group with its description
