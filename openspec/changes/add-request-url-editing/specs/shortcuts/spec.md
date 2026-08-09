# Spec: Shortcuts — Delta

## RENAMED Requirements

- FROM: `### Requirement: Edit body shortcut in registry`
- TO: `### Requirement: Edit request shortcut in registry`

## MODIFIED Requirements

### Requirement: Edit request shortcut in registry

The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an entry for the request-edit command with the following properties: `key: 'e'`, `label: ''` (empty, consistent with help-only entries like `o`, `R`, and `S`), `description: 'Edit request URL or body'`, `showInBar: false`, `showInHelp: true`, and `group: 'request'`.

#### Scenario: Registry contains e entry

- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'e'`, `description` equal to `'Edit request URL or body'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'request'`

#### Scenario: Edit shortcut not in status bar

- **WHEN** the StatusBar component renders
- **THEN** no entry for `e` SHALL appear in the status bar output (because `showInBar` is `false`), preserving the existing 6-item status bar budget

#### Scenario: Edit shortcut in help overlay

- **WHEN** the help overlay is visible
- **THEN** the `e` entry SHALL appear with key `e` in yellow (padded to 8 characters) and description `Edit request URL or body` in white, within the Request group

## ADDED Requirements

### Requirement: Switch editor tab shortcut in registry

The `SHORTCUTS` array in `src/core/shortcuts.ts` SHALL include an entry for the editor tab-switch command with the following properties: `key: 'Shift+Tab'`, `label: ''` (empty, consistent with the other `edit`-group entries), `description: 'Switch editor tab'`, `showInBar: false`, `showInHelp: true`, and `group: 'edit'`.

#### Scenario: Registry contains Shift+Tab entry

- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain an entry with `key` equal to `'Shift+Tab'`, `description` equal to `'Switch editor tab'`, `showInBar` equal to `false`, `showInHelp` equal to `true`, and `group` equal to `'edit'`

#### Scenario: Tab-switch shortcut not in status bar

- **WHEN** the StatusBar component renders
- **THEN** no entry for `Shift+Tab` SHALL appear in the status bar output (because `showInBar` is `false`), preserving the existing 6-item status bar budget

#### Scenario: Tab-switch shortcut in help overlay

- **WHEN** the help overlay is visible
- **THEN** the `Shift+Tab` entry SHALL appear with key `Shift+Tab` in yellow and description `Switch editor tab` in white, within the Edit group
