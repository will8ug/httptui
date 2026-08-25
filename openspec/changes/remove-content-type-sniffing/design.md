## Context

See proposal.md — Why. Two modules currently share a body-sniffing heuristic: `shouldAddJsonContentType` (`src/core/headers.ts`) returns true when a body's first non-whitespace character is `{` or `[` and no `Content-Type` header is present. `src/core/executor.ts` uses it to stamp `Content-Type: application/json` at send time; `src/core/curl-serializer.ts` uses it to emit `-H 'Content-Type: application/json'` in copy-as-curl. The paste-as-curl parser does not sniff: `-d`/`--data*` set the body only, and `--json` is an explicit JSON indication.

## Goals / Non-Goals

**Goals:**

- Remove all body-based `Content-Type` guessing. The `Content-Type` header is sent (executor) and emitted (serializer) only when the user explicitly provides one.
- Keep the parser unchanged: `--json` remains an explicit JSON indication; `-d`/`--data*` remain body-only.

**Non-Goals:**

- Adding curl's `-d` → `application/x-www-form-urlencoded` default. This is a deliberate divergence from curl.
- Changing Postman/OpenAPI import behavior (their parsers set `Content-Type` from explicit declared modes/media types, which is not guessing).

## Decisions

### D1: Delete `shouldAddJsonContentType` entirely

The helper has exactly two call sites (executor, serializer), both of which are being changed. Removing both leaves it dead, so the function is deleted rather than kept. No other module references it.

### D2: Executor sends headers verbatim for raw bodies

`executeRequest` drops the `shouldAddJsonContentType` block; the raw-body branch becomes `body = resolvedRequest.body`. The form-data branch is unchanged: `formdataFields` still builds `FormData` and strips the `Content-Type` header so undici generates the multipart boundary (the `formdata-body` capability, not guessing).

### D3: Serializer emits only the request's own headers

`toCurlCommand` drops the `shouldAddJsonContentType` block; it emits `--data-raw`/`--form-string` and the request's headers verbatim, with no synthesized `Content-Type`.

### D4: Parser is untouched

`parseCurlCommand` already honors only explicit indications: `-H 'Content-Type: …'` is kept, `--json` sets JSON headers explicitly, and `-d`/`--data*` set only the body. No change.

### D5: Round-trip stays exact with no refinement

Because no module synthesizes a `Content-Type` header, `parseCurlCommand(toCurlCommand(req))` preserves headers exactly — the round-trip requirement in the paste-as-curl spec needs no change.

## Risks / Trade-offs

- [Requests with a JSON body and no explicit `Content-Type` now send with no `Content-Type` header] → This is the intended behavior. Servers that require a `Content-Type` to parse JSON will reject or misparse such requests until the user adds the header. Accepted per the redesign.
- [Diverges from curl and from Postman's JSON auto-detection] → Accepted; the user prefers explicit-only over curl/Postman fidelity.
