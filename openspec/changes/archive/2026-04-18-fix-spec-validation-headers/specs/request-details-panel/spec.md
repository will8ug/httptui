## ADDED Requirements

### Requirement: Spec document structure
The `request-details-panel` spec SHALL contain a `## Purpose` section providing a brief description of the capability and a `## Requirements` section containing the normative requirements. All existing requirement and scenario content from the current `## ADDED Requirements` section SHALL be preserved verbatim under `## Requirements`.

#### Scenario: openspec validate passes for request-details-panel
- **WHEN** `openspec validate request-details-panel` is run
- **THEN** the spec SHALL be reported as valid

## MODIFIED Requirements

_(The `## ADDED Requirements` heading is replaced with `## Purpose` + `## Requirements` to satisfy the validator. No requirement text or scenarios are changed.)_