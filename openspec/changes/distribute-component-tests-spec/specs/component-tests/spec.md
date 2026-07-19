## REMOVED Requirements

### Requirement: ResponseView component tests
**Reason**: Process-shaped framing — the requirement mandates the existence and layout of test files rather than system behavior, repeating the pattern eliminated when the `testing` spec was deleted (`1af0b01`). Most scenarios duplicate behavior already mandated by `response-search` (search markers, search bar), `text-wrap` (wrap rendering), and `navigation` (horizontal-offset rendering).
**Migration**: The genuinely unspec'd behaviors (loading/error/empty states, pretty-print vs raw body display, verbose header display, visible-window slicing) now live in the new **response-view** spec. The `test/components/ResponseView.test.tsx` tests remain and verify those requirements.

### Requirement: RequestDetailsView component tests
**Reason**: Process-shaped framing (mandates test files) and duplication — all scenarios except formdata rendering restate behavior already mandated by the `request-details` spec's display and scrolling requirements.
**Migration**: The formdata-rendering gap is closed by the MODIFIED "Display resolved request details" requirement in **request-details**. The `test/components/RequestDetailsView.test.tsx` tests remain and verify those requirements.

### Requirement: StatusBar component tests
**Reason**: Process-shaped framing (mandates test files) and duplication — the shortcut-bar scenario duplicates `shortcuts`, the env-name scenario duplicates `runtime-environment-switching`, and the INSECURE scenario duplicates `executor` ("Insecure mode warning in status bar").
**Migration**: The genuinely unspec'd behaviors (per-panel context status text, transient message) now live in the new **status-bar** spec. The `test/components/StatusBar.test.tsx` tests remain and verify those requirements.
