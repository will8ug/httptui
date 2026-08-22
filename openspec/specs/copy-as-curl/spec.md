# Spec: Copy as curl

## Purpose

Copy the currently selected request as a runnable, single-line `curl` command to the system clipboard, reflecting the fully resolved request — including variable substitutions, the executor's implicit Content-Type defaulting, and TLS options — so the pasted command reproduces what httptui would send.

## Requirements

### Requirement: Serialize resolved request as curl command
The system SHALL provide a pure serialization of the currently selected request into a single-line `curl` command. The serialized request SHALL be the fully resolved request: all `{{variable}}` placeholders SHALL be substituted using the same variable-resolution path used when sending the request, with the same base directory for dotenv lookups. Values sourced from environment variables or dotenv SHALL appear resolved in the output — the copied command is intended to be runnable, and secret exposure on the clipboard is accepted behavior. The command SHALL start with `curl ` followed by the method flag, the quoted URL, one `-H` argument per header, the body arguments, and the TLS options, in that order, separated by single spaces.

#### Scenario: Simple GET request
- **WHEN** the selected request is a resolved `GET` to `https://api.example.com/users` with no headers, no body, and no TLS options
- **THEN** the copied command SHALL be `curl 'https://api.example.com/users'`

#### Scenario: Variable placeholders are resolved
- **WHEN** the selected request has url `https://{{baseUrl}}/users` and `baseUrl` resolves to `api.example.com`
- **THEN** the copied command SHALL contain the URL `https://api.example.com/users` and SHALL NOT contain `{{baseUrl}}`

#### Scenario: Secret values are resolved, not redacted
- **WHEN** the selected request has a header `Authorization: Bearer {{$dotenv API_KEY}}` and `API_KEY` resolves to `sk-live-abc123`
- **THEN** the copied command SHALL contain `-H 'Authorization: Bearer sk-live-abc123'`

### Requirement: Method flag mapping
The serializer SHALL map HTTP methods to curl method flags as follows: `GET` SHALL produce no method flag (curl's default); `HEAD` SHALL produce `-I`; all other methods SHALL produce `-X <METHOD>`. This mapping exists because `-X GET` is redundant and `-X HEAD` makes curl wait for a response body that will never arrive, while `-I` sets the method and reads headers correctly.

#### Scenario: GET emits no method flag
- **WHEN** the resolved request method is `GET`
- **THEN** the command SHALL NOT contain `-X` or `-I`

#### Scenario: HEAD emits -I
- **WHEN** the resolved request method is `HEAD`
- **THEN** the command SHALL contain `-I` and SHALL NOT contain `-X HEAD`

#### Scenario: POST emits -X POST
- **WHEN** the resolved request method is `POST`
- **THEN** the command SHALL contain `-X POST`

### Requirement: Header serialization with case preserved
Each resolved header SHALL be emitted as `-H 'Name: value'` with the header name's original casing preserved (not lowercased) and in the request's original header order. The URL argument SHALL always be wrapped in single quotes.

#### Scenario: Header casing is preserved
- **WHEN** the resolved request has headers `Accept-Encoding: gzip` and `X-Custom-Flag: 1`
- **THEN** the command SHALL contain `-H 'Accept-Encoding: gzip' -H 'X-Custom-Flag: 1'` with original casing

### Requirement: Raw body serialization
When the resolved request has a `body` and no form-data fields, the serializer SHALL emit `--data-raw '<body>'` with the body verbatim: whitespace, indentation, and embedded newlines SHALL be preserved inside the single quotes, and the body SHALL NOT be minified. The command SHALL NOT use backslash-newline continuations anywhere — multi-line bodies keep their literal newlines inside the quoted argument, so the command remains a single pasteable command line. `--data-raw` SHALL be used instead of `-d`/`--data` so that bodies beginning with `@` or containing `<` are sent literally rather than interpreted as file references.

#### Scenario: JSON body emitted verbatim
- **WHEN** the resolved request has body `{\n  "name": "Alice"\n}` (pretty-printed JSON)
- **THEN** the command SHALL contain `--data-raw '{` followed by the original indentation and newlines and closing `}'`, unchanged

#### Scenario: Body starting with @ is not treated as a file reference
- **WHEN** the resolved request has body `@literal-at-text`
- **THEN** the command SHALL contain `--data-raw '@literal-at-text'`

#### Scenario: No body emits no data flag
- **WHEN** the resolved request has no body and no form-data fields
- **THEN** the command SHALL NOT contain `--data-raw` or `--form-string`

### Requirement: Content-Type mirrors executor defaulting
The serializer SHALL apply the same implicit `Content-Type` rule as the request executor: when the resolved request has a body that is not form-data, has no `Content-Type` header (case-insensitive), and the body's first non-whitespace character is `{` or `[`, the serializer SHALL emit an additional `-H 'Content-Type: application/json'` after the request's own headers. When a `Content-Type` header is already present, the serializer SHALL NOT add one.

#### Scenario: JSON-looking body without Content-Type gains the header
- **WHEN** the resolved request has body `{"name":"Alice"}` and no `Content-Type` header
- **THEN** the command SHALL contain `-H 'Content-Type: application/json'`

#### Scenario: Explicit Content-Type is not duplicated
- **WHEN** the resolved request has body `<xml/>` and header `Content-Type: application/xml`
- **THEN** the command SHALL contain exactly one Content-Type header, `application/xml`

#### Scenario: Non-JSON body without Content-Type gains nothing
- **WHEN** the resolved request has body `plain text` and no `Content-Type` header
- **THEN** the command SHALL NOT contain any Content-Type header

### Requirement: Form-data body serialization
When the resolved request carries form-data fields, the serializer SHALL emit one `--form-string 'key=value'` argument per field, in field order, and SHALL omit any `Content-Type` header regardless of its value, mirroring the executor's unconditional removal of the header before send (curl generates its own multipart boundary, exactly as undici does). `--form-string` SHALL be used so that values beginning with `@` or `<` are sent literally rather than read as files.

#### Scenario: Text form-data fields serialize as form-string flags
- **WHEN** the resolved request has form-data fields `username=alice` and `note=@mention`
- **THEN** the command SHALL contain `--form-string 'username=alice' --form-string 'note=@mention'`
- **AND** the command SHALL NOT contain a `multipart/form-data` Content-Type header

#### Scenario: Non-multipart Content-Type is also omitted with form-data fields
- **WHEN** the resolved request has form-data fields and a `Content-Type: application/json` header
- **THEN** the command SHALL NOT contain any Content-Type header
- **AND** the `--form-string` arguments SHALL still be emitted

### Requirement: TLS option mapping
When insecure mode is active (the `--insecure`/`-k` CLI flag), the serializer SHALL append the `-k` flag to the command. When a client certificate matches the resolved request's host, the serializer SHALL append the certificate's file paths as quoted arguments: PEM entries as `--cert '<cert>' --key '<key>'`, PFX entries as `--cert '<pfx>' --pass '<passphrase>'`, and a `ca` file when present as `--cacert '<ca>'`. When neither applies, no TLS flags SHALL be emitted. No `--max-time` or `-L` flag SHALL be emitted: the executor's 30-second timeout is client policy rather than part of the request, and neither curl nor the executor follows redirects.

#### Scenario: Insecure mode adds -k
- **WHEN** httptui was started with `--insecure` and the user copies any request
- **THEN** the command SHALL end with the `-k` flag

#### Scenario: Matched PEM client certificate adds cert and key flags
- **WHEN** the resolved URL's host matches a PEM certificate entry with `cert: /certs/client.pem` and `key: /certs/client.key`
- **THEN** the command SHALL contain `--cert '/certs/client.pem' --key '/certs/client.key'`

#### Scenario: Matched PFX certificate adds cert and pass flags
- **WHEN** the resolved URL's host matches a PFX entry with `pfx: /certs/client.pfx` and passphrase `s3cret`
- **THEN** the command SHALL contain `--cert '/certs/client.pfx' --pass 's3cret'`

#### Scenario: No TLS options when none configured
- **WHEN** insecure mode is off and no certificate matches the host
- **THEN** the command SHALL NOT contain `-k`, `--cert`, `--key`, `--pass`, or `--cacert`

### Requirement: Bash single-quote escaping
Every argument (URL, `-H` values, `--data-raw` body, `--form-string` values, certificate paths, and the certificate passphrase) SHALL be wrapped in single quotes, and any embedded single quote SHALL be escaped as `'\''`. No platform-specific quoting variants SHALL be produced; the output targets POSIX shells, and Windows users paste it into bash-compatible environments (WSL, Git Bash) at their discretion.

#### Scenario: Embedded single quote is escaped
- **WHEN** the resolved request has header `X-Note: it's fine`
- **THEN** the command SHALL contain `-H 'X-Note: it'\''s fine'`

#### Scenario: Certificate passphrase with shell metacharacters is quoted
- **WHEN** the matched certificate has passphrase `p@a$s'word`
- **THEN** the command SHALL contain `--pass 'p@a$s'\''word'`

### Requirement: Clipboard delivery via native tools
The system SHALL copy the command to the system clipboard by invoking the platform's native clipboard tool: `pbcopy` on macOS (with UTF-8 locale so multi-byte characters survive), PowerShell `Set-Clipboard` on Windows (reading the text passed as a UTF-8 base64 argument, decoded inside the PowerShell command, to avoid console-codepage corruption; `clip.exe` SHALL NOT be used because it decodes stdin using the console codepage), and on Linux `wl-copy` when a Wayland display is present, otherwise `xclip -selection clipboard`, otherwise `xsel --clipboard --input` when an X11 display is present. The command SHALL be delivered with no trailing newline appended. No escape-sequence-based clipboard mechanism SHALL be used — native tools only.

#### Scenario: macOS uses pbcopy with UTF-8 locale
- **WHEN** the command is copied on macOS
- **THEN** the system SHALL spawn `pbcopy` with `LC_CTYPE=UTF-8` and write the command to its stdin

#### Scenario: Windows uses PowerShell Set-Clipboard with base64 transport
- **WHEN** the command is copied on Windows
- **THEN** the system SHALL spawn PowerShell, decode the UTF-8 base64 of the command, and pipe it to `Set-Clipboard`
- **AND** `clip.exe` SHALL NOT be spawned

#### Scenario: Linux Wayland session prefers wl-copy
- **WHEN** `WAYLAND_DISPLAY` is set and `wl-copy` is available
- **THEN** the system SHALL spawn `wl-copy` with the command on stdin

#### Scenario: Linux X11 session falls back through xclip to xsel
- **WHEN** no Wayland display is present and `xclip` is unavailable but `xsel` is installed
- **THEN** the system SHALL spawn `xsel --clipboard --input` with the command on stdin

### Requirement: Copy feedback and failure reporting
On successful clipboard write, the system SHALL display a transient success message (`Copied as curl`) using the existing transient-message mechanism. When no native clipboard tool can be spawned (tool missing, spawn error, or non-zero exit), the system SHALL display a transient error naming the remedy — which tool to install for the detected platform — and SHALL NOT display a success message. Because delivery uses native tools with observable exit status, success and failure messages SHALL both be truthful.

#### Scenario: Successful copy shows transient success
- **WHEN** the user presses the copy-as-curl key and the native clipboard tool exits with status 0
- **THEN** the status bar SHALL show a transient `Copied as curl` message

#### Scenario: Missing clipboard tool shows actionable error
- **WHEN** the user presses the copy-as-curl key on Linux and neither `wl-copy`, `xclip`, nor `xsel` can be spawned
- **THEN** the status bar SHALL show a transient error mentioning the tools to install (e.g. `xclip` or `wl-clipboard`)
- **AND** no success message SHALL be shown

### Requirement: Copy shortcut binding
The system SHALL bind the `y` key in normal mode to copy the currently selected request as a curl command. The `y` key SHALL NOT trigger when the application is in any other mode (`fileLoad`, `search`, `envSelect`, `saveLoad`, `edit`, `confirmDiscard`, `confirmInPlaceSave`) or while the help overlay is open. When no request is selected, pressing `y` SHALL do nothing.

#### Scenario: Press y in normal mode copies the selected request
- **WHEN** the application is in normal mode with a selected request and the user presses `y`
- **THEN** the system SHALL resolve the selected request, serialize it as a curl command, and copy it to the clipboard

#### Scenario: Press y in edit mode inserts nothing
- **WHEN** the application is in edit mode and the user presses `y`
- **THEN** the `y` SHALL be handled as edit-mode input and SHALL NOT trigger a copy

#### Scenario: Press y with no selected request is a no-op
- **WHEN** the request list is empty and the user presses `y` in normal mode
- **THEN** the system SHALL NOT spawn any clipboard tool and SHALL NOT display a success message
