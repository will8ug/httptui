## 1. Simple heading renames (6 specs)

- [ ] 1.1 In `openspec/specs/executor/spec.md`, rename `## Overview` to `## Purpose` (line 3).
- [ ] 1.2 In `openspec/specs/parser/spec.md`, rename `## Overview` to `## Purpose` (line 3).
- [ ] 1.3 In `openspec/specs/horizontal-navigation/spec.md`, rename `## Overview` to `## Purpose` (line 3).
- [ ] 1.4 In `openspec/specs/shortcuts/spec.md`, rename `## Overview` to `## Purpose` (line 3).
- [ ] 1.5 In `openspec/specs/text-wrap-toggle/spec.md`, rename `## Overview` to `## Purpose` (line 3).
- [ ] 1.6 In `openspec/specs/variables/spec.md`, rename `## Overview` to `## Purpose` (line 3).

## 2. Delta-format normalization (2 specs)

- [ ] 2.1 In `openspec/specs/details-panel-scrolling/spec.md`, add a `## Purpose` section at the top (before `## ADDED Requirements`), then rename `## ADDED Requirements` to `## Requirements`. Preserve all existing requirement and scenario content verbatim.
- [ ] 2.2 In `openspec/specs/request-details-panel/spec.md`, add a `## Purpose` section at the top (before `## ADDED Requirements`), then rename `## ADDED Requirements` to `## Requirements`. Preserve all existing requirement and scenario content verbatim.

## 3. TUI spec restructuring (1 spec)

- [ ] 3.1 In `openspec/specs/tui/spec.md`, rename `## Overview` to `## Purpose` (line 3). Add a `## Requirements` section after the `## Purpose` paragraph that consolidates the two normative requirements already in the spec body: the `Response panel title visibility` requirement (under `### Response Panel`) and the `Vertical Scroll Offset Clamping` requirement (under `### Vertical Scroll Offset Clamping`). Move these requirement blocks (including their `##### Scenario` sub-blocks, renumbered from `#####` to `####`) into `## Requirements`. Preserve all other sections (`## Layout`, `## Panels`, `## States`, `## Keyboard Shortcuts`, `## Startup`, `## Exit`, `## File Reload`, `## File Load`) as-is.

## 4. Validation

- [ ] 4.1 Run `openspec validate` for each of the 9 modified specs individually and confirm all pass.
- [ ] 4.2 Run `openspec validate --specs` and confirm 10/10 specs pass.