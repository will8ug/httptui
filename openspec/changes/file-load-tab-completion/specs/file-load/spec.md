## ADDED Requirements

### Requirement: Tab completes the partial file name against the input's directory segment

Pressing `Tab` in the file-load overlay SHALL complete the partial name against the entries of the directory named by the input up to the last path separator (or the process working directory when the input contains no separator), resolved against the process working directory consistently with Enter. Completion SHALL consider only the input text before the cursor. Entries whose names begin with `.` SHALL be excluded unless the partial name begins with `.`. Entries SHALL NOT be filtered by file extension.

When exactly one entry matches, the partial name SHALL be replaced by the full entry name; when that entry is a directory, a trailing path separator SHALL be appended so completion can be chained downward. When multiple entries match, the partial name SHALL be extended to their longest common prefix; when the longest common prefix equals the partial name, the input SHALL remain unchanged and the matching entry names SHALL be displayed in the overlay with directories marked by a trailing separator. The candidate display SHALL be a single row clipped to the overlay width, indicating the number of hidden entries when the list overflows. When no entries match, the input, cursor, and error state SHALL remain unchanged and no candidate list SHALL be displayed. The displayed candidate list SHALL be cleared by any subsequent edit or cursor movement.

#### Scenario: A single matching file completes in full
- **WHEN** the working directory contains `users.http` and no other entry starting with `use`, the input is `use`, and the user presses `Tab`
- **THEN** the input SHALL become `users.http` with the cursor at the end

#### Scenario: A single matching directory gains a trailing separator
- **WHEN** the working directory contains the directory `admin` and no other entry starting with `a`, the input is `a`, and the user presses `Tab`
- **THEN** the input SHALL become `admin/`

#### Scenario: Completion chains into a completed directory
- **WHEN** the input is `admin/`, the directory `admin` contains only `routes.http`, and the user presses `Tab`
- **THEN** the input SHALL become `admin/routes.http`

#### Scenario: Multiple matches extend to the longest common prefix without listing
- **WHEN** the working directory contains `users.http` and `users-staging.http`, the input is `u`, and the user presses `Tab`
- **THEN** the input SHALL become `users` and no candidate list SHALL be displayed

#### Scenario: Tab with no further progress displays the candidates
- **WHEN** the working directory contains `users.http` and `users-staging.http`, the input is `users`, and the user presses `Tab`
- **THEN** the input SHALL remain `users` and the overlay SHALL display `users.http` and `users-staging.http`

#### Scenario: Directories in the candidate list are marked with a trailing separator
- **WHEN** the working directory contains `admin/`, `assets/`, and `api.http`, the input is `a`, and the user presses `Tab`
- **THEN** the input SHALL remain `a` and the overlay SHALL display the directory candidates as `admin/` and `assets/`

#### Scenario: An overflowing candidate list is clipped with a hidden count
- **WHEN** the combined candidate names exceed the overlay width and the candidate list is displayed
- **THEN** the row SHALL be truncated to the overlay width and SHALL indicate the number of entries not shown

#### Scenario: No matches is a silent no-op
- **WHEN** no entry in the target directory starts with the partial name and the user presses `Tab`
- **THEN** the input and cursor SHALL remain unchanged, no candidate list SHALL be displayed, and no error SHALL be shown

#### Scenario: Typing clears the displayed candidate list
- **WHEN** the candidate list is displayed and the user types a character
- **THEN** the candidate list SHALL no longer be displayed

#### Scenario: Moving the cursor clears the displayed candidate list
- **WHEN** the candidate list is displayed and the user moves the cursor
- **THEN** the candidate list SHALL no longer be displayed

#### Scenario: Dotfiles are excluded from an empty partial name
- **WHEN** the input is `admin/`, the directory `admin` contains only `.env`, and the user presses `Tab`
- **THEN** the input SHALL remain `admin/` and no candidate list SHALL be displayed

#### Scenario: Dotfiles complete when the partial name starts with a dot
- **WHEN** the input is `admin/.`, the directory `admin` contains only `.env`, and the user presses `Tab`
- **THEN** the input SHALL become `admin/.env`

#### Scenario: Completion uses only the text before the cursor
- **WHEN** the working directory contains `users.http` and `users-staging.http`, the input is `usersX` with the cursor after `us`, and the user presses `Tab`
- **THEN** the input SHALL become `usersersX` with the cursor after the inserted `users`
