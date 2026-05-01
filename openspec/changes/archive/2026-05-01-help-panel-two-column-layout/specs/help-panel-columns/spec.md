## ADDED Requirements

### Requirement: Help overlay renders shortcut groups in two columns

The HelpOverlay component SHALL render shortcut groups in a two-column layout. The left column SHALL contain the "General" and "Navigation" groups (in that order). The right column SHALL contain the "Request", "Display", and "Search" groups (in that order).

#### Scenario: Two-column layout renders with correct group placement

- **WHEN** the help overlay is visible
- **THEN** the left column displays the "General" group header followed by its shortcuts, then the "Navigation" group header followed by its shortcuts
- **AND** the right column displays the "Request" group header followed by its shortcuts, then the "Display" group header followed by its shortcuts, then the "Search" group header followed by its shortcuts

#### Scenario: Columns render side-by-side reducing overall height

- **WHEN** the help overlay is visible
- **THEN** the rendered height of the shortcut section SHALL be approximately the height of the taller column (left: ~16 lines) rather than the sum of all groups (~30+ lines)

### Requirement: Column group assignment is defined as a data constant

A `HELP_COLUMN_GROUPS` constant SHALL be exported from `src/core/shortcuts.ts` defining which shortcut groups belong to each column. The constant SHALL be an array of arrays of `ShortcutGroup` values.

#### Scenario: Column assignment constant structure

- **WHEN** a developer imports `HELP_COLUMN_GROUPS` from `src/core/shortcuts.ts`
- **THEN** it SHALL be a readonly array with exactly 2 elements
- **AND** the first element SHALL be `['general', 'navigation']`
- **AND** the second element SHALL be `['request', 'display', 'search']`

### Requirement: Help overlay width accommodates two columns

The HelpOverlay SHALL use a maximum width of 90 columns and a minimum width of 64 columns to ensure both columns have sufficient space for key labels and descriptions.

#### Scenario: Overlay width on wide terminal

- **WHEN** the terminal width is 120 columns
- **THEN** the overlay width SHALL be 90 columns

#### Scenario: Overlay width on standard terminal

- **WHEN** the terminal width is 80 columns
- **THEN** the overlay width SHALL be 74 columns (80 - 6)

#### Scenario: Overlay width on narrow terminal

- **WHEN** the terminal width is 50 columns
- **THEN** the overlay width SHALL be 64 columns (the minimum floor)

### Requirement: Each column preserves existing shortcut rendering format

Within each column, shortcuts SHALL continue to render with the key in yellow padded to 8 characters, followed by the description in white. Group headers SHALL remain cyanBright and bold.

#### Scenario: Shortcut rendering within a column

- **WHEN** the help overlay is visible
- **THEN** each shortcut line within either column displays the key left-padded to 8 characters in yellow, followed by a space and the description in white
- **AND** each group's header text is rendered in cyanBright bold above its shortcuts
