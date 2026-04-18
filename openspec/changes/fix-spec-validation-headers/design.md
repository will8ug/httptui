## Context

The project has 10 spec files in `openspec/specs/`. Nine fail `openspec validate` because they use `## Overview` headers where the validator requires `## Purpose`, and/or they lack a `## Requirements` section. The tenth (`runtime`) passes because it was written against the validator schema from the start.

The validator enforces two required top-level sections:
1. `## Purpose` — a brief statement of what the capability covers.
2. `## Requirements` — the normative requirements with `### Requirement:` / `#### Scenario:` blocks.

The existing specs fall into three categories:

| Category | Specs | Current structure | Needed fix |
| --- | --- | --- | --- |
| Simple rename | `executor`, `parser`, `horizontal-navigation`, `shortcuts`, `text-wrap-toggle`, `variables` | `## Overview` + `## Requirements` | Rename `## Overview` → `## Purpose` |
| Missing both sections | `tui` | `## Overview` + custom sections (`## Layout`, `## Panels`, `## States`, etc.) but no `## Requirements` | Add `## Purpose`; move normative content into `## Requirements` |
| Delta format (archived change residue) | `details-panel-scrolling`, `request-details-panel` | `## ADDED Requirements` (no Purpose, no standard Requirements) | Add `## Purpose`; rename `## ADDED Requirements` to `## Requirements` |

All content (requirements, scenarios, descriptive text) will be preserved — only section headings and document structure change.

## Goals / Non-Goals

**Goals:**
- Make all 10 specs pass `openspec validate`.
- Preserve all existing normative content (requirements, scenarios, descriptions) verbatim.
- Establish `## Purpose` + `## Requirements` as the project convention going forward.

**Non-Goals:**
- Do not rewrite, refactor, or improve the substance of any spec. This is a heading-only change.
- Do not add new requirements or scenarios that don't already exist in the specs.
- Do not change any source code, config, or runtime behavior.

## Decisions

### D1. One delta spec per modified capability, even though changes are structural only

**Decision:** Create a delta spec for each of the 9 modified capabilities, using `## MODIFIED Requirements` where the change is a heading rename and `## ADDED Requirements` where a wholly new section is introduced (e.g., `## Purpose` in `tui`).

**Rationale:** The openspec convention requires one delta file per modified capability listed in the proposal. Even though the behavioral content doesn't change, the validator schema is itself a requirement — structural compliance is a testable property. Using delta specs gives the archive a clear record of what changed and why.

**Alternatives considered:**
- Skip delta specs entirely and just edit the main specs directly. **Rejected** — breaks openspec traceability.
- Use `## RENAMED Requirements` for heading renames. **Rejected** — the rename is a section heading, not a requirement name; RENAMED is for `### Requirement:` name changes, not `##` section headers.

### D2. `tui` spec: add `## Purpose` header and restructure to include `## Requirements`

**Decision:** Replace `## Overview` with `## Purpose` and add a `## Requirements` section that consolidates the normative requirements already embedded in the `tui` spec body (under `## Panels`, `## States`, `## Keyboard Shortcuts`, etc.) into properly-formatted `### Requirement:` blocks with `#### Scenario:` sub-blocks.

**Rationale:** The `tui` spec has rich normative content scattered across informal sections. The `## Requirements` section will pull those into the validator-required format while keeping the existing informal sections (`## Layout`, `## Startup`, `## Exit`) as-is for reference.

### D3. Delta-format specs: wrap existing content in proper sections

**Decision:** For `details-panel-scrolling` and `request-details-panel`, add a brief `## Purpose` section and rename `## ADDED Requirements` to `## Requirements`. The requirement and scenario content stays word-for-word identical.

**Rationale:** The delta `## ADDED Requirements` heading was appropriate when the change was in-flight (it was the format for the delta spec file). Now that it's merged into the main `openspec/specs/` directory, it needs the standard `## Purpose` + `## Requirements` structure. This is a structural normalization, not a semantic change.

## Risks / Trade-offs

- **Risk:** Copy-paste errors when restructuring `tui` spec could accidentally drop content.
  **Mitigation:** The `tui` spec restructuring will preserve all existing sections in-place; only a `## Purpose` section is added at the top and a `## Requirements` section is added to house normative content already written in the document. Diff review will catch any content loss.

- **Risk:** Delta specs for heading-only changes feel heavyweight.
  **Mitigation:** Each delta is tiny (a couple of lines), so the overhead is negligible. The traceability gain far outweighs the extra files.

- **Trade-off:** The change touches 9 of 10 specs in a single batch. If any spec has edge-case validator behavior (e.g., `tui`'s non-standard structure), it could require iteration.
  **Mitigation:** `openspec validate` can be run per-spec after each edit, giving fast feedback per file. The `tui` spec is the only one needing non-trivial restructuring; the other 8 are either a one-line rename or a simple section addition.