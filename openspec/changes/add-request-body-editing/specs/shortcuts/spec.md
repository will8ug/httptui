## ADDED Requirements

### Requirement: Edit body shortcut in registry

The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an entry for the body-edit command with the following properties: `key: 'e'`, `label: ''` (empty, consistent with help-only entries like `o`, `R`, and `S`), `description: 'Edit request body'`, `showInBar: false`, `showInHelp: true`, and `group: 'request'`.

#### Scenario: Registry contains e entry

- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'e'`, `description` equal to `'Edit request body'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'request'`

#### Scenario: Edit shortcut not in status bar

- **WHEN** the StatusBar component renders
- **THEN** no entry for `e` SHALL appear in the status bar output (because `showInBar` is `false`), preserving the existing 6-item status bar budget

#### Scenario: Edit shortcut in help overlay

- **WHEN** the help overlay is visible
- **THEN** the `e` entry SHALL appear with key `e` in yellow (padded to 8 characters) and description `Edit request body` in white, within the Request group
