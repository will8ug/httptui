# Proposal: Fix CRLF-mangled response body rendering

## Why

When an HTTP response body contains `\r\n` (CRLF) line endings — common for HTML, plain-text, and XML responses per RFC 2616 — the terminal UI renders corrupted output. Each line retains a trailing `\r` character, which the terminal interprets as "move cursor to column 0", causing subsequent lines to overwrite prior lines. The visible symptom is stacked / duplicated / garbled content in the Response panel (see `assets/crlf-messy-bug.png`). JSON responses accidentally sidestep the bug because `JSON.stringify` re-serialization strips CRLF; any non-JSON body breaks. This makes httptui unusable for anyone testing HTML, text, or XML APIs on servers that emit CRLF.

## What Changes

- The executor SHALL normalize `\r\n` and lone `\r` to `\n` in the captured response body before storing it in `ResponseData.body`, so every downstream consumer receives an LF-only string.
- No changes to `ResponseData` shape, rendering code, splitting logic, search indexing, or scroll math — the fix is upstream of all of them.
- Add executor unit test coverage for CRLF, lone-CR, and mixed line endings.
- Add an integration test asserting that a mocked HTML-with-CRLF response renders without `\r` characters leaking into `lastFrame()`.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `executor`: Add a requirement that the executor normalizes response body line endings to LF before returning `ResponseData`.

## Impact

- **Code**: `src/core/executor.ts` (single-line normalization after `response.body.text()`). No other source files change.
- **Tests**: `test/executor.test.ts` (add CRLF normalization scenarios). `test/integration/` (new test for CRLF+HTML render).
- **Behavior**: `ResponseData.body` is now guaranteed LF-only. Downstream code that assumed this (all 7 `split('\n')` sites) becomes correct. Byte-for-byte fidelity to the server's original body is lost — acceptable because httptui is a renderer, not a proxy or raw-bytes inspector. If a future "raw response" feature is added, it can preserve the unnormalized bytes separately.
- **APIs / Dependencies**: None.
- **Breaking**: None. No user-visible API; existing LF-only bodies are unaffected (normalization is a no-op on strings without `\r`).
