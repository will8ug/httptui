## 1. Core serialization

- [ ] 1.1 Extract the executor's JSON-body Content-Type predicate (body `trimStart()` starts with `{` or `[`) into a shared helper in `src/core/` (e.g. alongside `headers.ts`), and refactor `executor.ts` to use it — behavior unchanged
- [ ] 1.2 Implement `src/core/curl-serializer.ts`: `toCurlCommand(resolvedRequest, options)` producing the single-line command per the spec — method flag mapping (`GET` none / `HEAD` `-I` / others `-X`), always-quoted URL, `-H` per header with casing and order preserved, `--data-raw` verbatim bodies, `--form-string` form-data (omitting multipart Content-Type), executor-mirroring Content-Type defaulting via the shared helper, `-k`/`--cert`/`--key`/`--pass`/`--cacert` TLS options from the `options` argument, and single-quote `'\''` escaping for every quoted argument
- [ ] 1.3 Add `test/core/curl-serializer.test.ts` covering every spec scenario: GET/HEAD/POST flags, variable-resolved input, secrets resolved, header casing, verbatim multi-line body, `@`-prefixed body, Content-Type defaulting (JSON/no-CT/explicit-CT/non-JSON), form-data fields, all TLS mappings, quote escaping, and the no-body/no-TLS no-flag cases

## 2. Native clipboard module

- [ ] 2.1 Implement `src/core/clipboard.ts`: `copyToClipboard(text, run?)` with the platform chain from the design — macOS `pbcopy` with `LC_CTYPE=UTF-8`; Windows PowerShell `Set-Clipboard` via base64-UTF-8 argument; Linux `wl-copy` (when `WAYLAND_DISPLAY`) → `xclip -selection clipboard` → `xsel --clipboard --input` — writing stdin with no trailing newline, with an injectable spawner defaulting to `node:child_process`, and a `ClipboardError` naming installable tools when the chain is exhausted
- [ ] 2.2 Add `test/core/clipboard.test.ts` with an injected fake spawner asserting per-platform command/args/stdin (including the no-trailing-newline rule, the UTF-8 locale env for pbcopy, and base64 transport for PowerShell), spawn-failure fallback order, and the exhausted-chain error message

## 3. Wiring

- [ ] 3.1 Add the `y` entry to `SHORTCUTS` in `src/core/shortcuts.ts` (`key: 'y'`, `label: ''`, `description: 'Copy request as curl'`, `showInBar: false`, `showInHelp: true`, `group: 'request'`); extend `test/core/shortcuts.test.ts` with the registry scenario while keeping the 6-entry bar assertion untouched
- [ ] 3.2 Add `copySelectedAsCurl()` and the normal-mode `y` branch to `src/app.tsx` (near the `S`/`e`/`R` cluster): resolve via `resolveVariables(request, state.variables, dirname(state.filePath))`, run `matchCertificate` on the resolved URL for cert paths, call `toCurlCommand`, then `copyToClipboard` — dispatching `SET_TRANSIENT_MESSAGE` (`Copied as curl`) on success and a transient error with the install hint on failure; no-op when no request is selected
- [ ] 3.3 Add an integration test (following `test/integration/` patterns with a fake clipboard runner injected via app props) covering: `y` in normal mode shows the success message, `y` in edit mode inserts the character instead, clipboard failure shows the error message, and the help overlay renders the new Request-group entry

## 4. Verification and docs

- [ ] 4.1 Update the README shortcuts table (Request section: `y` → Copy request as curl) and the Features list
- [ ] 4.2 Run `npm run typecheck`, `npm run typecheck:test`, `npm run lint`, and `npm test` — all green
