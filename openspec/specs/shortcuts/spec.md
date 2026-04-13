# Spec: Shortcuts

## Overview

Centralized keyboard shortcut registry that serves as the single source of truth for all shortcut definitions, consumed by both StatusBar and HelpOverlay.

## Requirements

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

### Requirement: Status bar shows bar-visible shortcuts
The status bar SHALL display all shortcuts where `showInBar` is `true`: `[Enter] Send`, `[j/k] Nav`, `[←/→] Scroll`, `[Tab] Panel`, `[v] Verbose`, `[q] Quit`, `[?] Help` — in that order.

#### Scenario: Status bar rendering from data source
- **WHEN** the StatusBar component renders
- **THEN** it SHALL filter shortcuts where `showInBar === true` and render them as `[key] label` pairs separated by two spaces, in array order

#### Scenario: Status bar includes help shortcut
- **WHEN** the status bar is rendered
- **THEN** `[?] Help` SHALL appear as the last (rightmost) item

#### Scenario: Truncation preserves existing behavior
- **WHEN** the terminal width is too narrow to show all shortcuts
- **THEN** the status bar SHALL truncate the entire shortcut string from the right using the existing `truncateText` function

### Requirement: Help overlay renders from shared data
The HelpOverlay SHALL render all shortcuts from the centralized `SHORTCUTS` array, displaying each shortcut's `key` (padded to 8 characters) and `description`.

#### Scenario: Help overlay shows all shortcuts
- **WHEN** the help overlay is visible
- **THEN** it SHALL display all entries from `SHORTCUTS`, including those with `showInBar: false`

#### Scenario: Help overlay format
- **WHEN** a shortcut is rendered in the help overlay
- **THEN** the key SHALL be displayed in yellow, padded to 8 characters, followed by the description in white

### Requirement: No hardcoded shortcut strings
Neither StatusBar.tsx nor HelpOverlay.tsx SHALL contain hardcoded shortcut strings or arrays. All shortcut data SHALL come from the centralized `SHORTCUTS` export in `src/core/shortcuts.ts`.

#### Scenario: Removing hardcoded status bar string
- **WHEN** StatusBar.tsx is rendered
- **THEN** it SHALL NOT contain a hardcoded string like `'[Enter] Send  [j/k] Nav ...'`

#### Scenario: Removing hardcoded HelpOverlay SHORTCUTS array
- **WHEN** HelpOverlay.tsx is rendered
- **THEN** it SHALL NOT contain a local `SHORTCUTS` constant with shortcut definitions