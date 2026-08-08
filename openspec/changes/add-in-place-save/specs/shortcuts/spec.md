# Spec: Shortcuts — Delta

## ADDED Requirements

### Requirement: In-place save shortcut in registry

The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an entry for the in-place save command with the following properties: `key: 'Ctrl+S'`, `label: ''` (empty, consistent with help-only entries like `o`, `R`, and `S`), `description: 'Save to source file'`, `showInBar: false`, `showInHelp: true`, and `group: 'request'`.

#### Scenario: Registry contains the in-place save entry

- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'Ctrl+S'`, `description` equal to `'Save to source file'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'request'`

#### Scenario: In-place save shortcut not in status bar

- **WHEN** the StatusBar component renders
- **THEN** no additional entry SHALL appear in the status bar output (because `showInBar` is `false`), preserving the existing 6-item status bar budget

#### Scenario: In-place save shortcut in help overlay

- **WHEN** the help overlay is visible
- **THEN** the entry SHALL appear in the Request group with key `Ctrl+S` and description `Save to source file`
