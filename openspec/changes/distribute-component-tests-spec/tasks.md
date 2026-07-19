## 1. Sync delta specs to main specs

- [x] 1.1 Create `openspec/specs/response-view/spec.md` from the delta's ADDED requirements, with a `Spec: Response View` header and Purpose section (content states, body formatting display, verbose headers, visible-window slicing; cross-references to `navigation`, `text-wrap`, `response-search`)
- [x] 1.2 Create `openspec/specs/status-bar/spec.md` from the delta's ADDED requirements, with a `Spec: Status Bar` header and Purpose section (context-aware status text, transient message; cross-references to `shortcuts`, `runtime-environment-switching`, `executor`)
- [x] 1.3 Apply the MODIFIED "Display resolved request details" requirement to `openspec/specs/request-details/spec.md` (adds formdata-field rendering)
- [x] 1.4 Delete `openspec/specs/component-tests/spec.md`

## 2. Record the lesson learned

- [x] 2.1 Create root `AGENTS.md` with an "OpenSpec spec maintenance" section: maintain capability specs that describe system behavior; never mandate test files, test patterns, or test organization in specs (no process-shaped framing); tooling and test infrastructure are self-documenting in the repo; before adding a scenario, check whether an existing capability spec already mandates the behavior. Cite the precedent: `testing` spec deleted (`1af0b01`), `eslint-config` removed (`8fad1a7`), `component-tests` distributed by this change

## 3. Verify

- [x] 3.1 Run `openspec validate distribute-component-tests-spec --strict` and fix any issues
- [x] 3.2 Run `openspec list --specs` and confirm `component-tests` is gone and `response-view` / `status-bar` are present
- [x] 3.3 Run `npm test` — the full suite (including `test/components/*.test.tsx`, untouched) passes
- [x] 3.4 Run `npm run lint` — clean
