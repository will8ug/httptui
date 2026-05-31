## ADDED Requirements

### Requirement: Context-aware status bar displays panel-specific information
The status bar SHALL display context-aware information on the right side based on the currently focused panel. The file name SHALL always be visible, followed by a `|` separator and panel-specific status text.

#### Scenario: Requests panel focused shows request count
- **WHEN** the user is focused on the requests panel
- **THEN** the status bar right side SHALL display `{fileName} | {selectedIndex + 1}/{requestCount}`

#### Scenario: Details panel focused shows scroll position
- **WHEN** the user is focused on the request details panel and the content exceeds the visible height
- **THEN** the status bar right side SHALL display `{fileName} | ↕ {detailsScrollOffset + 1}/{detailsTotalLines} lines`

#### Scenario: Response panel focused shows scroll position
- **WHEN** the user is focused on the response panel and a response is displayed
- **THEN** the status bar right side SHALL display `{fileName} | ↕ {responseScrollOffset + 1}/{responseTotalLines} lines`

#### Scenario: Response panel focused with no response shows file name only
- **WHEN** the user is focused on the response panel but no response has been sent yet
- **THEN** the status bar right side SHALL display `{fileName}` without scroll position

## MODIFIED Requirements

### Requirement: Status Bar (bottom)
The status bar SHALL display keyboard shortcut hints on the left side (rendered from centralized shortcuts data, showing only items with `showInBar: true`; at most 6 shortcuts in the status bar — new shortcuts should default to `showInBar: false`) and context-aware panel information on the right side. The file name SHALL always be visible on the right side, followed by a `|` separator and panel-specific status text. The status bar SHALL be a single line, full width, with dimmed text.

#### Scenario: Status bar shows file name and request count when requests panel is focused
- **WHEN** the requests panel is focused
- **THEN** the status bar right side SHALL display `{fileName} | {selectedIndex + 1}/{requestCount}`

#### Scenario: Status bar shows file name and scroll position when details panel is focused
- **WHEN** the request details panel is focused and its content exceeds the visible height
- **THEN** the status bar right side SHALL display `{fileName} | ↕ {detailsScrollOffset + 1}/{detailsTotalLines} lines`

#### Scenario: Status bar shows file name and scroll position when response panel is focused
- **WHEN** the response panel is focused and a response is displayed
- **THEN** the status bar right side SHALL display `{fileName} | ↕ {responseScrollOffset + 1}/{responseTotalLines} lines`

## REMOVED Requirements

### Requirement: Inline scroll position indicator in request details panel
**Reason**: Scroll position is now displayed in the global status bar, making the inline indicator redundant.
**Migration**: No action required. The inline indicator is removed automatically when upgrading.
