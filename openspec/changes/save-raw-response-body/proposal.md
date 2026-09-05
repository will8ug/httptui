# Proposal: Save raw (unnormalized) response body

## Why

`s` (save response to file) currently writes the LF-normalized body: the executor replaces CRLF and lone CR with LF at capture (`fix-crlf-response-body`), so a saved file is not byte-identical to what the server sent. Users diffing saved responses against server fixtures or feeding them to line-ending-sensitive tooling get silently rewritten files. The original fix anticipated this: *"If a future 'raw response' feature is added, it can preserve the unnormalized bytes separately."*

## What Changes

- `ResponseData` gains a required `rawBody: string` field: the decoded body exactly as received, before line-ending normalization. `body` remains the LF-normalized string and continues to feed all display, search, wrap, and scroll consumers (unchanged — removing normalization would regress the CRLF rendering bug the original fix closed).
- The `s` save flow writes `rawBody` instead of `body`: the file preserves the server's original CRLF/CR line endings. No pretty-printing, no headers, no status line — unchanged.
- `s` refuses to enter the save overlay when the displayed response's body is empty (HEAD, OPTIONS, 204/304, empty 200s): a transient message states there is no response body to save. Previously an empty-body response opened the overlay and wrote a 0-byte file.
- `size.bodyBytes` is computed from `rawBody`, so it reports the true received size (today it under-reports for CRLF bodies; no production reader exists, so the correction is risk-free).
- Default filename derivation (`.json` vs `.txt`) is unchanged — `JSON.parse` tolerates CRLF, so detection is identical on either field.
- Fidelity boundary: "raw" means the UTF-8-decoded text with original line endings, not byte-for-byte (binary body preservation remains a non-goal, as in the original save-response change).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `executor`: The Response data structure requirement changes — `ResponseData` gains `rawBody` (body as received, pre-normalization), and `size.bodyBytes` is redefined as the byte length of `rawBody`. The existing line-ending normalization requirement for `body` is unchanged.
- `save-response`: Two requirements change — Raw body fidelity (the written file SHALL contain the body as received from the server, original CRLF/CR line endings preserved, not the normalized form), and the enter guard (`s` with an empty-body response SHALL NOT open the overlay and SHALL display a transient message instead of writing an empty file).

## Impact

- **Code**: `src/core/types.ts` (`ResponseData` + 1 field), `src/core/executor.ts` (return the already-computed `rawBody` local; compute `bodyBytes` from it), `src/app/input-handlers.ts` (save handler writes `rawBody` — one line). No reducer changes: `RECEIVE_RESPONSE` stores the response object verbatim. No rendering/search/wrap changes.
- **Tests**: `test/helpers/responses.ts` factory gains a `rawBody` default; response literals across tests gain `rawBody` mechanically (required field surfaces them at build time); executor tests assert `rawBody` preserved + `body` normalized + `bodyBytes` from raw; save-flow test asserts CRLF survives to disk.
- **APIs / Dependencies**: None.
- **Breaking**: None for LF-only bodies (`rawBody` === `body` there). Saved files from CRLF bodies now differ from previous behavior — that is the point of the change.
