# Stream all response bodies without a content-type gate

Streaming display applies to every response, whatever its content type. The response path has never inspected content-type or detected binary (every body is already decoded and rendered as text), so a gate would be new classification logic maintaining two display paths to protect the terminal from garbage it already displays after buffering; a text-like allowlist was considered and rejected on exactly that ground. Content-type inspection enters the codebase only when a display feature needs it, such as parsed SSE rendering.

## Consequences

- Binary bodies render as garbage progressively instead of garbage all at once; end state unchanged.
- Ordinary small responses that fit in one TLS record are visually indistinguishable from today.
- With no gate there is no place to special-case timeouts either: undici's default 300s body idle timeout is disabled for all requests, so a quiet event stream survives past five minutes and a genuinely hung body waits for the user's Esc instead of erroring, consistent with the no-deadlines execution posture.
