## MODIFIED Requirements

### Requirement: Status Bar (bottom)
- Left side: keyboard shortcut hints, rendered from the centralized shortcuts data source (only items where `showInBar` is `true`), in the order: `[Enter] Send  [j/k] Nav  [Tab] Panel  [v] Verbose  [q] Quit  [?] Help`
- Right side: file name, request count
- Single line, full width
- Dimmed text

#### Scenario: Status bar displays 6 shortcuts
- **WHEN** the status bar renders
- **THEN** it SHALL show exactly these 6 shortcuts in order: `[Enter] Send  [j/k] Nav  [Tab] Panel  [v] Verbose  [q] Quit  [?] Help`

#### Scenario: Status bar renders from shared data
- **WHEN** the status bar renders the shortcut hints
- **THEN** it SHALL derive them from the `SHORTCUTS` array in `src/core/shortcuts.ts` by filtering `showInBar === true`

### Requirement: Help Overlay
The help overlay lists all keyboard shortcuts from the centralized `SHORTCUTS` data source, including those not shown in the status bar.

#### Scenario: Help overlay shows all shortcuts
- **WHEN** the help overlay is visible
- **THEN** it SHALL display all shortcuts from `SHORTCUTS`, including `r` (raw), `o` (open), `R` (reload), `↑/↓`, and `Escape`

## REMOVED Requirements

### Requirement: Status bar hardcoded shortcut string
**Reason**: Replaced by data-driven rendering from centralized shortcuts data source
**Migration**: StatusBar.tsx now generates the shortcut hint string dynamically from `SHORTCUTS.filter(s => s.showInBar)` instead of a hardcoded string