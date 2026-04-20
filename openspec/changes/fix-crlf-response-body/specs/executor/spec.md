## ADDED Requirements

### Requirement: Response body line-ending normalization

The executor SHALL normalize line endings in the captured response body to LF (`\n`) before returning `ResponseData`. Both CRLF (`\r\n`) sequences and lone CR (`\r`) characters SHALL be replaced with LF. `ResponseData.body` returned by the executor SHALL NOT contain any `\r` characters.

This guarantees a single invariant that all downstream consumers (renderer, search indexer, scroll calculator, details panel) can rely on when splitting the body into lines via `split('\n')`.

#### Scenario: CRLF-terminated body is normalized
- **WHEN** a server responds with a body whose lines are terminated by `\r\n`
- **THEN** `ResponseData.body` SHALL contain the same text with every `\r\n` replaced by `\n`, and SHALL NOT contain any `\r` characters

#### Scenario: Lone CR in body is normalized
- **WHEN** a server responds with a body containing a lone `\r` that is not followed by `\n` (e.g. classic Mac line endings or a malformed stream)
- **THEN** `ResponseData.body` SHALL contain the same text with every lone `\r` replaced by `\n`, and SHALL NOT contain any `\r` characters

#### Scenario: Mixed line endings are normalized
- **WHEN** a server responds with a body that contains a mix of `\r\n`, `\r`, and `\n` line endings
- **THEN** `ResponseData.body` SHALL contain the same text with every line ending represented as a single `\n`, and SHALL NOT contain any `\r` characters

#### Scenario: LF-only body is unchanged
- **WHEN** a server responds with a body whose lines are already terminated only by `\n`
- **THEN** `ResponseData.body` SHALL be byte-identical to the server's body

#### Scenario: Empty body is unchanged
- **WHEN** a server responds with an empty body
- **THEN** `ResponseData.body` SHALL be the empty string `""`
