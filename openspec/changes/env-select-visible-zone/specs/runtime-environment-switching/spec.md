## MODIFIED Requirements

### Requirement: Environment picker overlay
The system SHALL render the environment picker as a centered overlay matching existing overlay conventions: `borderStyle="round"`, `borderColor="cyanBright"`, centered via `justifyContent="center"` and `alignItems="center"`, and width `Math.min(72, Math.max(48, columns - 6))`. The overlay SHALL display a `cyanBright` bold title `Select Environment`, the list of environment options, and a `gray` footer hint describing the controls. The highlighted option SHALL be rendered in `cyan` bold. The currently active environment SHALL be marked with a `magenta` `● ` prefix. Only one overlay SHALL be active at a time.

The overlay SHALL cap the number of visible option rows to `getEnvPickerVisibleHeight(rows)`, which returns `Math.min(MAX_ENV_PICKER_VISIBLE, Math.max(1, rows - ENV_PICKER_VERTICAL_OVERHEAD))` where `MAX_ENV_PICKER_VISIBLE` is 8. When the total number of options (including `(none)`) is less than or equal to this cap, the overlay SHALL render all options. When the total exceeds the cap, the overlay SHALL render only the windowed slice `options.slice(scrollOffset, scrollOffset + visibleCount)` so that the panel height never exceeds the terminal. The `(none)` option SHALL be the first scrollable item and SHALL count toward the visible cap.

The footer hint SHALL include the controls `↑↓`/`j`/`k` move, `g`/`G` top/bottom, `Enter` apply, and `Esc` cancel. The footer SHALL additionally display a compact position counter `{selectedIndex + 1}/{totalOptions}` indicating the 1-based position of the highlighted option and the total number of options.

#### Scenario: Overlay renders with conventions
- **WHEN** the environment picker is visible
- **THEN** it SHALL render a round `cyanBright`-bordered box centered in the terminal with a `cyanBright` bold `Select Environment` title and a `gray` footer hint

#### Scenario: Highlighted option styling
- **WHEN** an option is highlighted in the picker
- **THEN** that option's text SHALL be rendered in `cyan` bold

#### Scenario: Active environment marker
- **WHEN** the picker is open and an environment is currently active
- **THEN** the active environment's row SHALL display a `magenta` `● ` prefix

#### Scenario: Visible zone capped at 8 on a tall terminal
- **WHEN** 14 environments are available (including `(none)`) and the terminal has 24 rows
- **THEN** the overlay SHALL render at most 8 option rows, with the remaining options reachable by scrolling

#### Scenario: Overlay shrinks to fit when fewer environments exist
- **WHEN** 3 environments are available (including `(none)`) and the terminal has 24 rows
- **THEN** the overlay SHALL render all 3 option rows without empty padding rows

#### Scenario: Visible zone reduced on a short terminal
- **WHEN** 14 environments are available and the terminal has 12 rows
- **THEN** the overlay SHALL render fewer than 8 option rows (derived from `rows - ENV_PICKER_VERTICAL_OVERHEAD`) so that the panel does not overflow the terminal

#### Scenario: None counts toward the visible cap
- **WHEN** the visible cap is 8 and there are 9 real environments plus `(none)` (10 total)
- **THEN** the overlay SHALL render 8 rows including `(none)` as the first row, not 9 rows

#### Scenario: Position counter shown in footer
- **WHEN** the picker is open with 14 total options and the highlight is on the 5th option
- **THEN** the footer SHALL display `5/14` as part of the hint line

#### Scenario: Footer documents g and G keys
- **WHEN** the picker is visible
- **THEN** the footer hint SHALL mention `g` and `G` as top/bottom navigation keys alongside the existing `↑↓`, `Enter`, and `Esc` hints

### Requirement: Environment picker navigation and selection
The system SHALL support moving the highlight within the picker using the up/down arrow keys and `k`/`j`, clamped to the list bounds without wrapping. When the picker opens, the highlight SHALL be initialized to the currently active environment, or to the `(none)` option when no environment is active. Pressing `Enter` SHALL apply the highlighted option. Pressing `Esc` SHALL close the picker without changing the active environment.

The system SHALL maintain a scroll offset (`envSelectScrollOffset`) representing the index of the first visible option in the windowed slice. When the highlight moves via `k`/`j`/arrows, the scroll offset SHALL be adjusted via the existing `getVisibleRequestOffset(nextIndex, currentOffset, visibleCount)` helper so that the highlighted option remains within the visible window (cursor-chase scrolling). The scroll offset SHALL be reset to 0 when the picker opens and when the picker is cancelled.

The system SHALL support jumping the highlight to the first option via `g` and to the last option via `G`. When `g` is pressed, the highlight SHALL move to index 0 and the scroll offset SHALL adjust to keep it visible. When `G` is pressed, the highlight SHALL move to the last option index and the scroll offset SHALL adjust to keep it visible. The `g`/`G` keys SHALL only be active while the picker is in `envSelect` mode and SHALL NOT affect the request list or any other panel.

#### Scenario: Highlight initialized to active environment
- **WHEN** the active environment is `Staging` and the user opens the picker
- **THEN** the highlight SHALL start on the `Staging` row

#### Scenario: Highlight initialized to none when no environment active
- **WHEN** no environment is active and the user opens the picker
- **THEN** the highlight SHALL start on the `(none)` row

#### Scenario: Navigation is clamped
- **WHEN** the highlight is on the first option and the user presses up (or on the last option and presses down)
- **THEN** the highlight SHALL remain on that option (no wrap)

#### Scenario: Escape cancels without change
- **WHEN** the picker is open with active environment `Development` and the user presses `Esc`
- **THEN** the picker SHALL close, the mode SHALL return to `'normal'`, and the active environment SHALL remain `Development`

#### Scenario: Cursor-chase scrolls down
- **WHEN** the visible cap is 8, the highlight is on the 8th option (last visible row), and the user presses `j`
- **THEN** the highlight SHALL move to the 9th option and the scroll offset SHALL advance by 1 so the 9th option is visible

#### Scenario: Cursor-chase scrolls up
- **WHEN** the visible cap is 8, the scroll offset is 2, the highlight is on the 3rd option (first visible row at offset 2), and the user presses `k`
- **THEN** the highlight SHALL move to the 2nd option and the scroll offset SHALL decrease by 1 so the 2nd option is visible

#### Scenario: Cursor stays in view without scrolling
- **WHEN** the visible cap is 8, the scroll offset is 0, the highlight is on the 4th option, and the user presses `j`
- **THEN** the highlight SHALL move to the 5th option and the scroll offset SHALL remain 0 (no scroll needed)

#### Scenario: Scroll offset resets on open
- **WHEN** the user opens the picker
- **THEN** the scroll offset SHALL be 0, showing the first `visibleCount` options starting from `(none)`

#### Scenario: g jumps to first option
- **WHEN** the picker is open with the highlight on the 10th option and the user presses `g`
- **THEN** the highlight SHALL move to the first option (index 0) and the scroll offset SHALL reset to 0

#### Scenario: G jumps to last option
- **WHEN** the picker is open with 14 total options, the highlight on the 3rd option, and the user presses `G`
- **THEN** the highlight SHALL move to the 14th option (last index) and the scroll offset SHALL adjust so the last option is visible

#### Scenario: g and G do not affect the request list
- **WHEN** the picker is in `envSelect` mode and the user presses `g` or `G`
- **THEN** only the environment picker highlight and scroll offset SHALL change; the request list selection and scroll SHALL remain unchanged
