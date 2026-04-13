## MODIFIED Requirements

### Requirement: Centralized shortcut registry
The system SHALL define all keyboard shortcuts in a single source of truth at `src/core/shortcuts.ts`. Each shortcut SHALL have a `key` (display key), `label` (short label for status bar), `description` (full description for help overlay), and `showInBar` (boolean controlling status bar visibility) field. The registry SHALL include entries for `←/h` (scroll left) and `→/l` (scroll right) with `showInBar: true`.

#### Scenario: All shortcuts are defined in one place
- **WHEN** a developer needs to add, remove, or modify a keyboard shortcut
- **THEN** they SHALL update only `src/core/shortcuts.ts` and both StatusBar and HelpOverlay SHALL reflect the change

#### Scenario: Shortcut type safety
- **WHEN** the `SHORTCUTS` array is imported
- **THEN** each entry SHALL conform to the `Shortcut` interface with `key: string`, `label: string`, `description: string`, and `showInBar: boolean`

#### Scenario: Horizontal scroll shortcuts present in registry
- **WHEN** the `SHORTCUTS` array is inspected
- **THEN** it SHALL contain entries for left and right horizontal scrolling with keys `←/h` and `→/l` respectively, each with `showInBar: true`