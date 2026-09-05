## MODIFIED Requirements

### Requirement: Response data structure
The executor SHALL return `ResponseData` with `statusCode`, `statusText`, `headers` (as `Record<string, string>`), `body` (normalized string), `rawBody` (the decoded body exactly as received, before line-ending normalization), `timing.durationMs` (total request duration in milliseconds), and `size.bodyBytes` (the UTF-8 byte length of `rawBody`). When the received body contains no CR characters, `rawBody` SHALL equal `body`.

#### Scenario: Response data captured from successful request
- **WHEN** a request succeeds with status 200
- **THEN** the executor SHALL return `ResponseData` with all fields populated, including timing and size metrics

#### Scenario: Raw body preserves the server's line endings
- **WHEN** a server responds with a body whose lines are terminated by `\r\n` (or containing lone `\r` characters)
- **THEN** `ResponseData.rawBody` SHALL be identical to the received body, with every `\r` character intact
- **AND** `ResponseData.body` SHALL be the LF-normalized counterpart, as required by the line-ending normalization requirement

#### Scenario: Body size reflects the received body
- **WHEN** a server responds with a CRLF-terminated body of 10 lines
- **THEN** `size.bodyBytes` SHALL equal the UTF-8 byte length of `rawBody`, which is greater than the byte length of the normalized `body`
