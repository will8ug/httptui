## ADDED Requirements

### Requirement: Save response shortcut in registry

The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an entry for the save-response command with the following properties: `key: 's'`, `label: ''` (empty, consistent with help-only entries like `o`, `R`, and `S`), `description: 'Save response to file'`, `showInBar: false`, `showInHelp: true`, and `group: 'request'`.

#### Scenario: Registry contains s entry

- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'s'`, `description` equal to `'Save response to file'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'request'`

#### Scenario: Save-response shortcut not in status bar

- **WHEN** the StatusBar component renders
- **THEN** no entry for `s` SHALL appear in the status bar output (because `showInBar` is `false`), preserving the existing 6-item status bar budget

#### Scenario: Save-response shortcut in help overlay

- **WHEN** the help overlay is visible
- **THEN** the `s` entry SHALL appear with key `s` in yellow (padded to 8 characters) and description `Save response to file` in white, within the Request group
