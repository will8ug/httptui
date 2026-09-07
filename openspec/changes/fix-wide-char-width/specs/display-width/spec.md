## Purpose

Terminal display-cell semantics for all text measurement and slicing in the TUI: widths are counted in terminal display cells (not string code units), boundaries never split wide characters or grapheme clusters, and rendered lines never exceed their panel's content width.

## ADDED Requirements

### Requirement: Display-cell width measurement
All text width budgeting — wrapping, truncation, horizontal shifting, tab expansion, and longest-line measurement for scroll clamps — SHALL measure text width in terminal display cells. Wide characters (e.g. CJK ideographs) SHALL count as 2 cells, and grapheme clusters with combining marks or zero-width joiners (e.g. emoji sequences, flags) SHALL count as the rendered width of the whole cluster rather than the sum of their parts.

#### Scenario: CJK line budgeted by cells
- **WHEN** a line of 20 CJK characters is measured against a width budget of 20 cells
- **THEN** the line SHALL be treated as 40 cells wide and SHALL NOT be considered to fit

#### Scenario: Emoji sequence measured as one cluster
- **WHEN** a multi-codepoint emoji sequence (such as a family emoji joined by zero-width joiners, or a regional-indicator flag) is measured
- **THEN** the sequence SHALL count as a single unit of 2 cells, not as the sum of its constituent codepoints' widths

### Requirement: Grapheme-safe boundaries
When a wrap, truncation, or horizontal-shift boundary falls inside a wide character or multi-codepoint grapheme cluster, the boundary SHALL move to the nearest cluster edge rather than splitting the cluster: for wrapping and shifting the cluster SHALL be kept whole on the side it belongs; for truncation the straddling cluster SHALL be excluded from the visible portion.

#### Scenario: Wide character straddling a wrap boundary moves to the next line
- **WHEN** a wrapped line's remaining cell budget is 1 and the next character is a wide character
- **THEN** the wide character SHALL begin the next visual line intact instead of being split or half-rendered

#### Scenario: Truncation excludes a straddling wide character
- **WHEN** a truncated line's cell budget ends where a wide character would begin with only 1 remaining cell
- **THEN** the wide character SHALL be excluded from the truncated output and the truncation indicator SHALL occupy the final cell

### Requirement: Rendered lines stay within panel bounds
Every visual line rendered in any panel — including lines carrying a search-match marker — SHALL occupy at most the panel's content width in display cells, so no rendered content can overflow the panel border or corrupt the surrounding layout.

#### Scenario: Search-marked line stays within bounds
- **WHEN** a response body line is marked as a search match and the marker glyph is rendered alongside it
- **THEN** the marker plus the line's text SHALL occupy at most the panel's content width in cells

#### Scenario: Panel chrome remains intact for wide-character content
- **WHEN** a response body containing long multilingual lines is displayed in any wrap mode
- **THEN** the panel borders, title, search bar, and status bar SHALL render in their correct positions without content-induced displacement
