---
status: accepted
---

# Retire OpenSpec; adopt the engineering-skills workflow

We removed `openspec/` and its change workflow, replacing them with the skills pipeline (grill, to-spec, to-tickets, implement) and a division of knowledge between AGENTS.md, CONTEXT.md, ADRs, and the test suite. The bookkeeping cost of delta specs and change archiving had exceeded their value in a solo-maintainer repo.

## Context

At the time of the decision the repo carried 38 capability specs (~5.7k lines) under `openspec/specs/` plus 99 archived changes under `openspec/changes/archive/`. Every behavior those specs described already had a verifier in the test suite, and AGENTS.md carried the working conventions. Writing and archiving delta specs for each change had become pure overhead: the spec author, the implementer, and the reviewer are the same person, so the prose contracts were being written for an audience of one that already read the tests.

## Decision

- Remove `openspec/` entirely. The archive is backed up outside git.
- Translate, don't port: this ADR plus the root `CONTEXT.md` (capability map and glossary) are the only carry-forward documents.
- Planning runs through the skills pipeline (grill, to-spec, to-tickets, implement) with a local-markdown issue tracker under `.scratch/` (gitignored by design; see `docs/agents/issue-tracker.md`).
- Durable knowledge lives in `CONTEXT.md` and `docs/adr/`; conventions stay in `AGENTS.md`; behavior contracts remain pinned by the test suite.

## Consequences

- Positive: a single source of truth per concern. Domain vocabulary: `CONTEXT.md`. Decisions: `docs/adr/`. Conventions: `AGENTS.md`. Behavior: tests. No delta-spec bookkeeping, no archiving step.
- Trade-off: no prose WHEN/THEN behavior contracts remain. Behavioral truth lives in tests, which pin what the code does today but do not state intent the way scenarios did; recovering the old spec prose requires git history. Tracker files under `.scratch/` are untracked by design, so plans live only on the machine that wrote them.
