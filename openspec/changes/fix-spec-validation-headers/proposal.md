## Why

Nine of the project's ten specs fail `openspec validate`. Every failure is the same structural issue: the validator requires `## Purpose` and `## Requirements` as top-level sections, but all existing specs use `## Overview` instead. The recently-created `runtime` spec is the only one that passes because it was written to match the validator's schema from the start. Fixing this is low-risk, mechanical, and unblocks `openspec validate --specs` returning a clean bill of health — which is the primary CI-readiness gate for the spec system.

## What Changes

- Rename `## Overview` to `## Purpose` in 7 specs that currently have `## Overview` and `## Requirements` sections (the simple case).
- Convert 2 delta-format specs (`details-panel-scrolling`, `request-details-panel`) from bare `## ADDED Requirements` to a proper `## Purpose` + `## Requirements` structure so they validate without losing their content.
- Restructure the `tui` spec to include a `## Purpose` section (preserving existing content) and add a `## Requirements` section with the normative requirements already embedded in the spec's other sections, so that `openspec validate` passes.

## Capabilities

### New Capabilities

_(None — no new capabilities introduced.)_

### Modified Capabilities

The following existing specs receive structural (not behavioral) changes. Their requirements and scenarios remain identical; only section headings and document structure change to satisfy the validator:

- `executor`: Rename `## Overview` → `## Purpose`
- `parser`: Rename `## Overview` → `## Purpose`
- `horizontal-navigation`: Rename `## Overview` → `## Purpose`
- `shortcuts`: Rename `## Overview` → `## Purpose`
- `text-wrap-toggle`: Rename `## Overview` → `## Purpose`
- `variables`: Rename `## Overview` → `## Purpose`
- `tui`: Add `## Purpose` section; add `## Requirements` section consolidating normative requirements already in the spec body
- `details-panel-scrolling`: Replace `## ADDED Requirements` with `## Purpose` + `## Requirements` structure
- `request-details-panel`: Replace `## ADDED Requirements` with `## Purpose` + `## Requirements` structure

## Impact

- **Spec files only** — no source code, config, or runtime changes.
- `openspec/specs/` directory: 9 files modified (heading renames and structural additions only).
- `openspec validate --specs` will go from 0/10 passing to 10/10 passing.
- No downstream effect: the spec content (requirements, scenarios) is preserved verbatim; only section headings and document structure change.