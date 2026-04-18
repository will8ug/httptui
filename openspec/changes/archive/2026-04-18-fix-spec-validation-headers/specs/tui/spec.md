## ADDED Requirements

### Requirement: Spec document structure
The `tui` spec SHALL contain a `## Purpose` section providing a brief description of the capability and a `## Requirements` section containing normative requirements. The existing `## Overview` heading SHALL be renamed to `## Purpose`. All informal descriptive sections (`## Layout`, `## Panels`, `## States`, `## Startup`, `## Exit`, `## File Reload`, `## File Load`, `## Keyboard Shortcuts`) SHALL be preserved as-is.

#### Scenario: openspec validate passes for tui
- **WHEN** `openspec validate tui` is run
- **THEN** the spec SHALL be reported as valid

## MODIFIED Requirements

_(The `## Overview` section heading is renamed to `## Purpose`. No requirement text or scenarios are changed. A `## Requirements` section will be added to satisfy the validator; it consolidates normative content already present in the document body — specifically the `Response panel title visibility` requirement and the `Vertical Scroll Offset Clamping` requirement that already exist in the main spec.)_