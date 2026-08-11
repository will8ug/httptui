## 1. Header text conversion helpers

- [ ] 1.1 Create `src/core/headers.ts` with `headersToText(headers: Record<string, string>): string`, serializing one `Name: Value` line per entry in record insertion order
- [ ] 1.2 Implement `parseHeadersText(text: string): { ok: true; headers: Record<string, string> } | { ok: false; error: string; line: number }` in `src/core/headers.ts`: split each non-blank line on the first `:`, trim key and value, treat empty trimmed key as an error, skip blank lines, resolve case-insensitive duplicate keys last-wins with the later line's casing (mirroring `parser.addHeader`), return the 1-based line number on failure
- [ ] 1.3 Add `test/core/headers.test.ts` covering: round-trip `parseHeadersText(headersToText(h))`, first-colon-only splitting (`Authorization: Basic dXNlcjpwYXNz`), whitespace trimming, blank-line skipping, case-insensitive duplicate last-wins, empty-key error with line number, empty input parses to `{}`

## 2. Type model

- [ ] 2.1 Widen `EditTarget` in `src/core/types.ts:105` to `'body' | 'headers' | 'url'`
- [ ] 2.2 Add `EDIT_TAB_ORDER: readonly EditTarget[] = ['url', 'body', 'headers']` next to `EditTarget` in `src/core/types.ts`
- [ ] 2.3 Update all `editBuffers` reset sites to include a `headers` entry: `COMMIT_EDIT` success (`src/core/reducer.ts:763-764`), `CANCEL_EDIT` (`:776-777`), and initial state (`:868-869`)

## 3. Editor entry and tab cycle

- [ ] 3.1 In `src/app.tsx:585`, seed the headers buffer via `headersToText(selectedRequest.headers)` in the `ENTER_EDIT` dispatch
- [ ] 3.2 In `src/core/reducer.ts` `ENTER_EDIT` (`:680-697`), seed the `headers` buffer from `action.buffers.headers` with its cursor at end-of-buffer
- [ ] 3.3 Replace the hardcoded `Shift+Tab` cycle in `src/app.tsx:399-403` with `EDIT_TAB_ORDER[(index + 1) % length]` wrap-around
- [ ] 3.4 Replace the literal `tabs={['url', 'body']}` in `src/app.tsx:756` with `tabs={EDIT_TAB_ORDER}` so the tab strip shows `url`, `body`, `headers`

## 4. Commit and cancel semantics

- [ ] 4.1 Extend `COMMIT_EDIT` (`src/core/reducer.ts:747-770`) to parse the headers buffer via `parseHeadersText` and reject on failure: keep `mode` as `'edit'`, leave every buffer untouched, set `transientError` to a message naming the malformed line (e.g. `Cannot save: header line 3 is missing a ":"`), and do not apply any tab's buffer
- [ ] 4.2 On successful parse, commit `nextHeaders` (empty buffer → `{}`) into the request via `{ ...req, headers: nextHeaders, ... }` in the `.map` update
- [ ] 4.3 Fold header changes into `changed` with order-insensitive `headersEqual` (compare key sets and values, ignoring order), so line reordering alone is not a change

## 5. Save-path guard

- [ ] 5.1 Add `headersContainSeparator(headers: Record<string, string>): boolean` to `src/core/in-place-save.ts` alongside `bodyContainsSeparator`, detecting a serialized header line that would collide with the `###` block separator
- [ ] 5.2 Wire the check into the save guard at `src/core/in-place-save.ts:108-109` with an error message mirroring the body case, and cover it in `test/core/in-place-save.test.ts`

## 6. Shortcuts and documentation

- [ ] 6.1 Update the `e` shortcut description in `src/core/shortcuts.ts` from "Edit request URL or body" to mention headers
- [ ] 6.2 Update the README shortcuts table entry for `e` if it lists the old wording

## 7. Tests

- [ ] 7.1 Extend `test/core/request-editing.test.ts` with reducer scenarios: headers buffer seeded on `ENTER_EDIT`, `COMMIT_EDIT` stores parsed headers, empty buffer commits as `{}`, malformed line rejects commit with `transientError` and mode stays `'edit'`, `changed` includes header edits but not pure line reordering
- [ ] 7.2 Extend `test/core/request-editing.test.ts` with `SWITCH_EDIT_TAB` scenarios for the three-way cycle (url→body→headers→url) including wrap-around
- [ ] 7.3 Extend `test/integration/request-url-editing.test.tsx` (or a new `request-headers-editing.test.tsx` following its pattern) with integration scenarios: opening the editor on a request with headers seeds the headers tab, editing and committing headers updates the request-details panel, malformed header line keeps the overlay open
- [ ] 7.4 Extend `test/components/EditOverlay.test.tsx` if it asserts a fixed tab list, updating to the three-tab strip
- [ ] 7.5 Run `npm test` and `npm run build` to confirm the full suite passes with the widened `EditTarget`
