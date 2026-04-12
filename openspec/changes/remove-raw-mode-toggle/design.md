## Context

The TUI currently supports a `rawMode` state toggled by the `r` key. When active, `formatResponseBody` returns the response body as-is instead of pretty-printing JSON. In practice, this toggle is invisible for most APIs (which return already-formatted JSON) and there is no visual indicator that raw mode is active. The feature adds state, a keyboard shortcut, and rendering logic without providing meaningful user value.

The removal touches 5 source files and the TUI spec, but the change is straightforward — deleting code paths rather than adding new ones.

## Goals / Non-Goals

**Goals:**
- Remove the `r` key shortcut and all `rawMode` state/logic from the codebase
- Keep response body rendering as it currently works by default (pretty-print JSON, pass through non-JSON unchanged)

**Non-Goals:**
- Changing how response bodies are formatted (the default behavior stays)
- Adding new keyboard shortcuts or view modes
- Modifying the help overlay beyond removing the `r` entry

## Decisions

1. **Always pretty-print JSON** — `formatResponseBody` loses its `raw` parameter and always attempts JSON pretty-printing. Non-JSON responses continue to pass through unchanged. This is the simplest approach and matches what users currently see 100% of the time (since raw mode was invisible).

2. **Remove the `r` shortcut entirely** — Rather than repurposing the `r` key for something else, simply remove it. Fewer shortcuts means less cognitive load for users. The key can be reassigned in a future change if needed.

## Risks / Trade-offs

- **Users who relied on `r` for minified endpoints** → Risk: some users may have used raw mode to view minified JSON in its original single-line form. Mitigation: this was an edge case; the feature was effectively invisible for most use. If needed, a future "compact view" could be added with a different design.
- **Key conflict with existing `R` (uppercase)** → No risk. Removing lowercase `r` creates no conflict with uppercase `R` (reload).