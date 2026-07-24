## 1. Tab Expansion Utility

- [x] 1.1 Add `expandTabs(line: string, tabWidth = 8): string` function to `src/utils/text.ts`. Each `\t` expands to the number of spaces needed to reach the next multiple of `tabWidth` from the current column position within the line.
- [x] 1.2 Write unit tests for `expandTabs` covering: no tabs (passthrough), leading tabs, mid-line tabs, consecutive tabs, tab at column 0, tab at column 7 (1 space to next stop), mixed tabs and spaces.

## 2. Request Details Panel Fix

- [x] 2.1 In `src/components/RequestDetailsView.tsx`, apply `expandTabs` to each body line before passing to `shiftText`. The expansion happens after the `bodyLines[i] || ' '` fallback.
- [x] 2.2 Write component test: body content with tab characters renders without stray border characters or overflow when the panel is maximized. Use a body string with `\t\t\t\t<element/>` lines and verify no content extends past the panel's right border.
- [x] 2.3 Write component test: body content without tabs renders identically to before (no regression).

## 3. Response View Fix

- [x] 3.1 In `src/core/response-layout.ts`, apply `expandTabs` to `safeLine` in `buildBodyLineVisualLines` before any wrapping or truncation. Replace `const safeLine = rawLine === '' ? ' ' : rawLine` with `const safeLine = rawLine === '' ? ' ' : expandTabs(rawLine)`.
- [x] 3.2 Write test: raw-mode response body with tab characters renders correctly within the panel bounds (no overflow artifacts).

## 4. Verification

- [x] 4.1 Run the full test suite (`npm test`) and confirm all tests pass.
- [x] 4.2 Run `lsp_diagnostics` on all modified files (`src/utils/text.ts`, `src/components/RequestDetailsView.tsx`, `src/core/response-layout.ts`) and confirm no errors.
- [x] 4.3 Manually verify the fix: open the Postman collection from the bug report, navigate to the 7th request, open details (`d`), focus details (`Tab`), maximize (`f`), and confirm no stray `│` characters or overflow on tab-indented XML lines.
