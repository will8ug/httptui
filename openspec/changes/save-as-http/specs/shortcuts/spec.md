## ADDED Requirements

### Requirement: Save shortcut in registry
The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an entry for the save-as-http command with the following properties: `key: 'S'`, `label: ''` (empty, consistent with help-only entries like `o` and `R`), `description: 'Save as .http file'`, `showInBar: false`, `showInHelp: true`, and `group: 'request'`.

#### Scenario: Registry contains S entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'S'`, `description` equal to `'Save as .http file'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'request'`

#### Scenario: Save shortcut not in status bar
- **WHEN** the StatusBar component renders
- **THEN** no entry for `S` SHALL appear in the status bar output (because `showInBar` is `false`), preserving the existing 6-item status bar budget

#### Scenario: Save shortcut in help overlay
- **WHEN** the help overlay is visible
- **THEN** the `S` entry SHALL appear with key `S` in yellow (padded to 8 characters) and description `Save as .http file` in white, within the Request group
