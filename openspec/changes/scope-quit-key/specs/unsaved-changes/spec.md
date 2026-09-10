## MODIFIED Requirements

### Requirement: Confirm before discarding unsaved changes

While the unsaved-changes flag is set, pressing `R` (reload), `o` (open a different file), `q` (quit), or `Ctrl+G` (open the source file in an external editor) SHALL NOT perform the action immediately. The system SHALL instead enter a confirmation mode, record which action was intercepted, and display a confirmation prompt. When the flag is unset, all four keys SHALL behave exactly as they do today with no prompt.

`q` is intercepted only when the press would otherwise quit. When search results are displayed, `q` dismisses them instead of quitting (see the **response-search** spec), so there is no pending action to confirm and no prompt SHALL be displayed. The unsaved-changes flag SHALL remain set, and the subsequent `q` — with no results left to dismiss — SHALL be intercepted normally.

`Ctrl+G` is intercepted because the file on disk does not contain edits that have been committed in the request editor but not yet saved; handing that file to an external editor and reloading it would discard them. The interception SHALL occur only once the handoff is otherwise permitted — a source that fails the http-format gate SHALL be refused before any prompt is displayed (see the **editor-handoff** spec).

#### Scenario: Reload is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `R`
- **THEN** a confirmation prompt SHALL be displayed and the file SHALL NOT be reloaded

#### Scenario: Open file is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `o`
- **THEN** a confirmation prompt SHALL be displayed and the file-load overlay SHALL NOT be displayed

#### Scenario: Quit is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set, no search results are displayed, and the user presses `q`
- **THEN** a confirmation prompt SHALL be displayed and the application SHALL NOT exit

#### Scenario: Quit is not intercepted while search results are displayed

- **WHEN** the unsaved-changes flag is set, search results are displayed, and the user presses `q`
- **THEN** no confirmation prompt SHALL be displayed, the search results SHALL be dismissed, the application SHALL NOT exit, and the unsaved-changes flag SHALL remain set

#### Scenario: Quit is intercepted on the press after a dismissal

- **WHEN** the unsaved-changes flag is set and the user presses `q` a second time, having dismissed the displayed search results with the first press
- **THEN** a confirmation prompt SHALL be displayed and the application SHALL NOT exit

#### Scenario: External editor handoff is intercepted when there are unsaved changes

- **WHEN** the unsaved-changes flag is set and the user presses `Ctrl+G` on an http-format source
- **THEN** a confirmation prompt SHALL be displayed and no editor SHALL be launched

#### Scenario: A refused source is not intercepted

- **WHEN** the unsaved-changes flag is set and the user presses `Ctrl+G` on a Postman or OpenAPI source
- **THEN** no confirmation prompt SHALL be displayed and the format refusal message SHALL be shown instead

#### Scenario: No prompt when there are no unsaved changes

- **WHEN** the unsaved-changes flag is unset and the user presses `R`
- **THEN** the file SHALL reload immediately with no confirmation prompt

#### Scenario: No prompt for the external editor when there are no unsaved changes

- **WHEN** the unsaved-changes flag is unset and the user presses `Ctrl+G` on an http-format source
- **THEN** the editor SHALL be launched immediately with no confirmation prompt
