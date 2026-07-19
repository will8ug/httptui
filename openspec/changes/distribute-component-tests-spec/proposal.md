## Why

The `component-tests` main spec is a pure testing spec — its Requirements mandate that "the test suite SHALL include" specific test files, which is process-shaped framing, not system behavior. This repeats the pattern the project deliberately eliminated when the `testing` spec was deleted (`1af0b01`, "Delete a spec purely for testing") alongside other meta/tooling specs (`eslint-config`, `system-ca`). Worse, ~22 of its 33 scenarios duplicate behavior already mandated by `response-search`, `text-wrap`, `request-details`, `navigation`, `shortcuts`, `runtime-environment-switching`, and `executor` — so every rendering behavior change now risks needing two spec updates, the exact duplication pain that motivated the `56093c1` spec trim.

## What Changes

- Triage every scenario in `component-tests`: delete the ones duplicating existing capability-spec behavior, and move the genuinely unspec'd behaviors to proper capability homes.
- Create a new `response-view` capability spec covering the response panel's content states (loading / error / empty), body formatting display (pretty-print default, raw bypass), verbose header display, and render-level scroll slicing — behaviors with no requirement-level home today.
- Create a new `status-bar` capability spec covering the per-panel context status text and the transient message — behaviors currently mentioned only in `tui` freeform text.
- Modify `request-details` to close a real gap the component tests exposed: formdata fields are rendered but the spec's display requirement never mentions them.
- **BREAKING (spec structure only)**: Remove the `component-tests` spec entirely. No code changes; the tests in `test/components/` stay and now verify behavior spec'd in proper homes.
- Add a root `AGENTS.md` recording the spec-maintenance lesson: maintain capability specs describing system behavior; never mandate test files/organization in specs (no process-shaped framing); tooling and test infrastructure are self-documenting in the repo.

## Capabilities

### New Capabilities
- `response-view`: Rendering behavior of the response panel's content states (loading spinner, error message, empty prompt, response body), pretty-print vs raw body display, verbose header display, and render-level slicing of the visible window.
- `status-bar`: The bottom status bar's context-aware status text per focused panel (requests / details / response variants) and the transient confirmation message. (Shortcut-bar content stays in `shortcuts`; env-name indicator stays in `runtime-environment-switching`; INSECURE indicator stays in `executor`.)

### Modified Capabilities
- `request-details`: The display requirement gains formdata-field rendering (currently rendered by `RequestDetailsView` but unspecified).
- `component-tests`: All requirements removed; spec deleted. Unique behavioral scenarios migrate to `response-view` / `status-bar` / `request-details`; duplicate scenarios are dropped.

## Impact

- **Spec files**: `openspec/specs/response-view/spec.md` and `openspec/specs/status-bar/spec.md` created; `openspec/specs/request-details/spec.md` modified; `openspec/specs/component-tests/spec.md` deleted.
- **Docs**: root `AGENTS.md` created with the spec-maintenance guidance.
- **No `src/**` or `test/**` changes.** No dependency changes. The existing component tests continue to pass unchanged — they verify the newly spec'd behaviors.
- **Precedent**: follows the established spec-hygiene direction from `36d03f0` (Refactor specs for SOLID), `56093c1` (trim duplicated docs), `8fad1a7` (remove eslint-config spec), and `1af0b01` (delete testing spec).
