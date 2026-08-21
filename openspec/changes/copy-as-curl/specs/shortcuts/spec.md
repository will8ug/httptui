# Spec: Shortcuts

## ADDED Requirements

### Requirement: Copy as curl shortcut in registry
The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an entry for the copy-as-curl command with the following properties: `key: 'y'`, `label: ''` (empty, consistent with help-only entries like `o`, `R`, and `S`), `description: 'Copy request as curl'`, `showInBar: false`, `showInHelp: true`, and `group: 'request'`.

#### Scenario: Registry contains y entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'y'`, `description` equal to `'Copy request as curl'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'request'`

#### Scenario: Copy-as-curl shortcut not in status bar
- **WHEN** the StatusBar component renders
- **THEN** no entry for `y` SHALL appear in the status bar output (because `showInBar` is `false`), preserving the existing 6-item status bar budget

#### Scenario: Copy-as-curl shortcut in help overlay
- **WHEN** the help overlay is visible
- **THEN** the `y` entry SHALL appear with key `y` in yellow (padded to 8 characters) and description `Copy request as curl` in white, within the Request group
