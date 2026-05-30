# Spec: Shortcuts (Delta)

## ADDED Requirements

### Requirement: Fullscreen toggle shortcut in registry
The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an entry for the fullscreen toggle with the following properties: `key: 'f'`, `label: ''`, `description: 'Toggle fullscreen for focused panel'`, `showInBar: false`, `showInHelp: true`, `group: 'display'`.

#### Scenario: Registry contains f entry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'f'`, `description` equal to `'Toggle fullscreen for focused panel'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'display'`

#### Scenario: Fullscreen shortcut not in status bar
- **WHEN** the StatusBar component renders
- **THEN** no entry for `f` SHALL appear in the status bar output (because `showInBar` is `false`)

#### Scenario: Fullscreen shortcut in help overlay
- **WHEN** the help overlay is visible
- **THEN** the `f` entry SHALL appear with key `f` in yellow (padded to 8 characters) and description `Toggle fullscreen for focused panel` in white, within the Display group