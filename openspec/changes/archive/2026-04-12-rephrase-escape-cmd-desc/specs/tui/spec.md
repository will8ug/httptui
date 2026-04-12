## MODIFIED Requirements

### Requirement: Keyboard Shortcuts

The TUI SHALL define a `SHORTCUTS` array where each entry has a `key`, `label`, `description`, and `showInBar` field. The Escape key entry SHALL have the description `"Close current overlay"`.

#### Scenario: Escape description in shortcuts data
- **WHEN** the `SHORTCUTS` array is rendered in the help overlay
- **THEN** the Escape key SHALL display with the description `"Close current overlay"`

#### Scenario: Escape description in status bar or help
- **WHEN** a user views any display of the Escape shortcut description
- **THEN** the description shown SHALL be `"Close current overlay"`

### Requirement: Help Overlay Hint Text

The help overlay SHALL display a hint at the bottom that reads `"Press Escape or ? to close this overlay"`.

#### Scenario: Hint text shown in help overlay
- **WHEN** the help overlay is visible
- **THEN** the bottom hint text SHALL read `"Press Escape or ? to close this overlay"`