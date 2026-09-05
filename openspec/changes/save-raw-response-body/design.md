## Context

See proposal.md for motivation. Relevant current state:

- The executor captures `rawBody` as a local (`await response.body.text()`), normalizes CRLF/lone CR to LF, and returns only the normalized string (`src/core/executor.ts:147-160`). The raw string is discarded; `size.bodyBytes` is computed from the normalized string.
- Normalization exists to fix a rendering bug (`fix-crlf-response-body`, archived `2026-04-21`): a trailing `\r` makes the terminal return the cursor to column 0, garbling the response panel. Every display/search/wrap/scroll consumer assumes LF-only (`split('\n')` in `scroll.ts`, `response-layout.ts`, `reducers/search.ts`, `input-handlers.ts`). That change's impact note pre-blessed this design: "If a future 'raw response' feature is added, it can preserve the unnormalized bytes separately."
- `RECEIVE_RESPONSE` (`src/core/reducers/lifecycle.ts`) stores the response object into `state.response` verbatim — new fields on `ResponseData` flow into state with zero reducer changes.
- The save handler writes `state.response.body` (`src/app/input-handlers.ts:379`); filename derivation runs `isJsonBody` on the body, and `JSON.parse` tolerates CRLF, so `.json`/`.txt` detection is identical on either field.

## Goals / Non-Goals

**Goals:**

- A saved file byte-identical to the server's response body (line endings included).
- Zero change to rendering, search, wrap, scroll, copy, and filename-derivation behavior.

**Non-Goals:**

- Removing or relocating the normalization (the rendering fix stays intact).
- Binary body preservation — capture still decodes via `response.body.text()`; "raw" means the UTF-8-decoded text with original line endings (non-goal inherited from the original save-response change).
- Buffer/byte-level fidelity for bodies that are not valid UTF-8.

## Decisions

### D1: Carry both `rawBody` and `body` on `ResponseData`

Executor returns `rawBody` (as received) alongside the normalized `body`. All existing consumers keep reading `body`; only the save handler switches to `rawBody`.

- Alternative: normalize at render time instead of capture — touches ~6 LF-sensitive consumer sites and re-risks the rendering bug the original fix closed; explicitly rejected by that fix's design ("the fix is upstream of all of them").
- Alternative: un-normalize at save — impossible; the CR information is destroyed at capture.

### D2: `rawBody` is a required field, no `?? body` fallback in the save handler

The executor is the sole producer of `ResponseData`; a required field makes the contract honest and lets `tsc` surface every test literal that constructs a response. The save handler reads `state.response.rawBody` directly.

- Alternative: optional field with fallback — keeps old tests green but permits a state where fidelity silently degrades; rejected.

### D3: `size.bodyBytes` computed from `rawBody`

Today it under-reports for CRLF bodies (computed from the normalized string). No production code reads `size.bodyBytes` (verified by search; only the producer writes it), so the correction is risk-free and makes the field truthful.

### D4: Filename derivation unchanged

`deriveResponseSaveFilename` continues to run `isJsonBody` on the stored body it already receives. `JSON.parse` treats CR as whitespace, so detection results are identical on `rawBody` and `body`; no code change.

### D5: Empty-body responses are refused, not saved as empty files

Body-less responses are real (`HEAD` returns no body by definition; `OPTIONS` commonly empty; 204/304 null bodies) and resolve to `''` through `response.body.text()` — an empty body is a value, not a missing field, so D2's required-field contract holds unconditionally (`rawBody === body === ''`, `bodyBytes = 0`).

Pressing `s` SHALL refuse when there is nothing to save: the existing no-response guard (`state.response === null`, at the `s` binding site in `handleNormalInput`) extends to also cover an empty `rawBody` — both cases dispatch a transient message and never enter the overlay. The empty-body case uses a distinct message ("no response body to save") so it is distinguishable from "no response to save". The guard keys on `rawBody` because that is what the save writes.

- Rejected alternative (previous position): save a faithful 0-byte file — an empty file is what the server sent. Rejected on reflection: a HEAD-style response yields a surprise empty artifact with no content value, and refusing mirrors the existing no-response guard shape the flow already established.

This is observable behavior: the `save-response` delta spec modifies the enter-guard requirement accordingly.

## Risks / Trade-offs

- [Test literals missing `rawBody` fail to compile] → Intentional (D2); the compiler enumerates the construction sites. Mechanical fix only.
- [Saved files from CRLF bodies differ from previous saves] → The intended behavior change; LF-only bodies are unaffected (rawBody equals body when no CR is present).
- [Two copies of large CRLF bodies in memory] → Accepted: response bodies in this tool are already fully buffered as strings; doubling only occurs when CR characters exist. No streaming/pagination exists to regress.

## Migration Plan

Additive — one new field, one write-site switch, one size recomputation. Rollback is reverting the commit.
