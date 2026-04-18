## MODIFIED Requirements

### Requirement: Spec document structure
The `## Overview` section heading SHALL be renamed to `## Purpose`.

#### Scenario: openspec validate passes after rename
- **WHEN** `openspec validate executor` is run
- **THEN** the spec SHALL be reported as valid