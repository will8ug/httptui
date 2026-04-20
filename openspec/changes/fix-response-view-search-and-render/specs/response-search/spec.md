## MODIFIED Requirements

### Requirement: Scroll-to-match adjusts for visual-line layout
When scrolling to a match, the system SHALL set `responseScrollOffset` to the **visual line index** at which the matching raw body line begins in the rendered response. The visual line index SHALL account for:
- the number of visual lines occupied by the status line (which MAY exceed 1 in `wrap` mode when the status text exceeds `contentWidth`),
- the number of visual lines occupied by each verbose header (which MAY exceed 1 per header in `wrap` mode when a header line exceeds `contentWidth`; counted only when `verbose` is on),
- the single separator visual line,
- and the cumulative visual-line expansion of preceding body lines (each raw body line MAY occupy more than 1 visual line in `wrap` mode).

The offset SHALL be clamped to the maximum scroll offset. Callers dispatching `CONFIRM_SEARCH`, `NEXT_MATCH`, and `PREV_MATCH` SHALL compute the target visual line index from the canonical response-layout ledger (`computeResponseLayout`) rather than from scalar arithmetic such as `1 + headerCount + 1`.

#### Scenario: Scroll to match without verbose headers in nowrap mode
- **WHEN** `wrapMode` is `'nowrap'`, `verbose` is off, and a match is on raw body line 5
- **THEN** `responseScrollOffset` SHALL be set to `5 + 2` (status + separator) = `7`

#### Scenario: Scroll to match with verbose headers in nowrap mode
- **WHEN** `wrapMode` is `'nowrap'`, `verbose` is on with 4 response headers, and a match is on raw body line 5
- **THEN** `responseScrollOffset` SHALL be set to `5 + 6` (status + 4 headers + separator) = `11`

#### Scenario: Scroll to match in wrap mode with a wrapped verbose header
- **WHEN** `wrapMode` is `'wrap'`, `verbose` is on, one header line occupies 2 visual lines because it exceeds `contentWidth`, 3 other header lines each occupy 1 visual line, and a match is on raw body line 5 (which itself does not wrap and no preceding body line wraps)
- **THEN** `responseScrollOffset` SHALL be set to the visual index equal to `1 (status) + 5 (headers, with the long one counted as 2) + 1 (separator) + 5 (body lines before the match, all unwrapped)` = `12`
- **AND** the scroll SHALL land on the visual line that actually displays the match, not on a preceding visual line

#### Scenario: Scroll to match in wrap mode with a wrapped status line
- **WHEN** `wrapMode` is `'wrap'`, the status text wraps to 2 visual lines, `verbose` is off, and a match is on raw body line 0
- **THEN** `responseScrollOffset` SHALL be set to `2 (wrapped status) + 1 (separator) + 0` = `3`
- **AND** the scroll SHALL land on the visual line that actually displays the match

#### Scenario: Scroll to match in wrap mode with preceding wrapped body lines
- **WHEN** `wrapMode` is `'wrap'`, `verbose` is off, the status line is not wrapped, raw body line 0 occupies 3 visual lines (it wraps), raw body line 1 occupies 1 visual line, and a match is on raw body line 2
- **THEN** `responseScrollOffset` SHALL be set to `1 (status) + 1 (separator) + 3 (body[0]) + 1 (body[1])` = `6`
- **AND** the scroll SHALL land on the visual line that actually displays the match

### Requirement: Arrow indicator on matching lines
`ResponseView` SHALL render a `►` prefix on the **visual line** at which the raw body line identified by `searchMatches[currentMatchIndex]` begins, in a bright color (cyanBright). Other matching raw body lines SHALL have a `·` prefix rendered at their first visual line in a dim color (gray). Non-matching visual lines SHALL have no prefix change. The visual line for each raw body line SHALL be determined by the canonical response-layout ledger (`computeResponseLayout`), so that markers land correctly in both `wrap` and `nowrap` modes regardless of wrapped status, wrapped verbose headers, or wrapped body lines.

#### Scenario: Current match indicator in nowrap mode
- **WHEN** the response panel renders with `wrapMode === 'nowrap'` and raw body line 5 is the current match
- **THEN** the visual line corresponding to raw body line 5 SHALL be prefixed with `►` in cyanBright color

#### Scenario: Other match indicator in nowrap mode
- **WHEN** the response panel renders with `wrapMode === 'nowrap'` and raw body line 12 is a match but not the current match
- **THEN** the visual line corresponding to raw body line 12 SHALL be prefixed with `·` in gray color

#### Scenario: Current match indicator in wrap mode with wrapped headers
- **WHEN** `wrapMode === 'wrap'`, `verbose` is on, one header wraps to 2 visual lines, and raw body line 3 is the current match
- **THEN** the `►` prefix SHALL decorate the visual line that actually displays the start of raw body line 3, not a visual line offset by the flattened `1 + headerCount + 1` arithmetic

#### Scenario: Current match indicator in wrap mode with wrapped preceding body lines
- **WHEN** `wrapMode === 'wrap'`, raw body line 0 wraps to 3 visual lines, raw body line 1 is the current match
- **THEN** the `►` prefix SHALL decorate the first visual line of raw body line 1, which is 3 visual lines below the start of raw body line 0

#### Scenario: No matches active
- **WHEN** there are no search matches
- **THEN** no visual lines SHALL have match indicators
