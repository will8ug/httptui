## 1. Clipboard read path

- [ ] 1.1 Add `ClipboardReadRunner` type and `readFromClipboard(options)` to `src/core/clipboard.ts` per design D1: candidate loop mirroring the write side (`pbpaste` + `LC_CTYPE=UTF-8`; PowerShell with UTF-8 output encoding and `Get-Clipboard -Raw`; `wl-paste` → `xclip -selection clipboard -o` → `xsel --clipboard --output`), `ClipboardError` with per-platform remedy messages on total failure
- [ ] 1.2 Unit-test `readFromClipboard` in `test/core/clipboard.test.ts` (or a sibling file following existing naming): platform dispatch, first-candidate fallback, non-zero exit rejection, stdout capture — using the injectable runner, no real clipboard

## 2. Curl parser

- [ ] 2.1 Create `src/core/curl-parser.ts` with the shell tokenizer (design D3: single/double/unquoted states, backslash escapes, backslash-newline continuations, literal `$`) and export `parseCurlCommand(text): { ok: true; request: ParsedRequest; skipped: boolean } | { ok: false; error: string }` — pure, no I/O, no stderr writes
- [ ] 2.2 Implement refusal gates (design D5): empty input, command separators (`&&`, `||`, `;`, `|`, `--next`) and second `curl`, non-`curl` first token, URL count ≠ 1, method outside the `HttpMethod` union (named in error), unparseable URL — each with its user-facing error string
- [ ] 2.3 Implement the flag table (design D4): supported flags (method/URL/headers/data/form), silent conversions (`-u`, `-b`, `--json`, `-A`, `-e`), warn-skip flags with correct arity (including the arity-1 skip list so arguments are consumed), unknown-flag boolean fallback, curl's default-POST-with-data rule, repeated-data `&` concatenation, form-wins-over-data, last-wins headers, `http://` prepending, `@`/`<` file-reference skips
- [ ] 2.4 Build the pasted `ParsedRequest`: `isDirty: true`, `lineNumber: 0` sentinel, name `${method} ${pathname || '/'}`
- [ ] 2.5 Unit-test in `test/core/curl-parser.test.ts` covering every spec scenario in `specs/paste-as-curl/spec.md` (tokenizing/quoting/continuations, all conversions, warn-skip families, every refusal, name derivation, form/data interactions) plus a round-trip property: for representative request fixtures, `parseCurlCommand(toCurlCommand(resolved, …))` reproduces method, URL, headers (order included), body, and form-data text fields, with TLS flags at most setting `skipped`

## 3. State: transient warning + append action

- [ ] 3.1 Add `transientWarning: string | null` to `AppState` (init `null`), and actions `SET_TRANSIENT_WARNING`, `SET_TRANSIENT_ERROR`, and `APPEND_REQUEST` to the `Action` union in `src/core/types.ts`
- [ ] 3.2 Implement reducer cases in `src/core/reducer.ts`: the two setters enforce three-way exclusivity (setting any transient clears the other two); extend `CLEAR_TRANSIENT_MESSAGE` to clear all three channels; `APPEND_REQUEST` appends, selects the new last index, clamps `requestScrollOffset`, resets horizontal/details offsets, clears search state — mirroring `SELECT_REQUEST` and leaving `response` untouched — and replaces the parser's `lineNumber: 0` placeholder with `max(existing lineNumbers) + 1` so `RequestList` composite React keys stay unique across repeated pastes
- [ ] 3.3 Extend the transient auto-clear effect in `src/app.tsx` so a warning clears on the same ~2s text-change-reset window as messages and errors
- [ ] 3.4 Unit-test the reducer cases in `test/core/reducer.test.ts` (or sibling): exclusivity matrix (warning vs message vs error), warning auto-clear behavior, append mechanics (placement, selection, scroll clamping, search-state reset, response preserved, `isDirty` set), and `lineNumber` uniqueness — two identical `APPEND_REQUEST`s yield distinct lineNumbers (never `0`)

## 4. Status bar warning surface

- [ ] 4.1 Render `transientWarning` in `StatusBar.tsx`: yellow bold text beside message/error, included in the left-side width budget; thread the prop through `app.tsx`/`Layout` as existing transients are
- [ ] 4.2 Test the rendering (unit or component level per existing status-bar test patterns): shown when set, absent when null, yellow bold, width accounting

## 5. Paste wiring

- [ ] 5.1 Add `clipboardReadRunner?: ClipboardReadRunner` to `AppProps` and a `pasteFromClipboard()` handler in `app.tsx` beside `copySelectedAsCurl()`: read → `parseCurlCommand` → dispatch `APPEND_REQUEST` + `SET_TRANSIENT_WARNING` (`Pasted request — some curl options were skipped`) or `SET_TRANSIENT_MESSAGE` (`Pasted request`) or `SET_TRANSIENT_ERROR` (refusal reason / clipboard remedy)
- [ ] 5.2 Bind `p` in the normal-mode branch of `useInput` (beside `y`; no guard needed for other modes per existing structure) and register `{ key: 'p', group: 'request', showInBar: false, showInHelp: true }` in `SHORTCUTS`
- [ ] 5.3 Integration-test in `test/integration/paste-as-curl.test.tsx` mirroring `copy-as-curl.test.tsx`'s injected-runner pattern: clean paste appends + selects + green message; warn-skip paste appends + yellow warning; each refusal leaves the list unchanged with red error; `p` inert in edit mode and with help open; pasting the same command twice renders both rows (no duplicate React keys)
- [ ] 5.4 Add `p` to the README keyboard-shortcuts table

## 6. Persistence of pasted requests

- [ ] 6.1 Extend `buildInPlaceContent` in `src/core/in-place-save.ts` per design D8: treat a request-count surplus as appended requests, serializing them (via `serializeRequestBlock`, `###`-separated, EOL-consistent) after existing content; keep the refusal for a deficit; update the JSDoc contract note
- [ ] 6.2 Test in-place append: pasted (dirty, `lineNumber: 0`) request + in-place save → file gains a valid new block, existing content byte-identical; deficit still refuses; CRLF files keep CRLF
- [ ] 6.3 Verify save-as (`S`) already serializes pasted requests via `serializeHttpFile`; add a test if coverage is missing

## 7. Verification

- [ ] 7.1 Run the full suite (`npm test`), lint, and build; confirm no regressions and that every scenario in both delta specs has a corresponding passing test
