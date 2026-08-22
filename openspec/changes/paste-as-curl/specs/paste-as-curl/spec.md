## Purpose

Import a curl command copied to the system clipboard as a new request appended to the request list, warning about — but not blocked by — curl capabilities httptui cannot represent.

## ADDED Requirements

### Requirement: Read clipboard via native tools
The system SHALL read the clipboard by invoking the platform's native clipboard tool: `pbpaste` on macOS (with UTF-8 locale so multi-byte characters survive), PowerShell `Get-Clipboard` on Windows (with output encoding forced to UTF-8 and `-Raw` so multi-line content survives), and on Linux `wl-paste` when a Wayland display is present, otherwise `xclip -selection clipboard -o`, otherwise `xsel --clipboard --output` when an X11 display is present. When no native clipboard tool can be run, the system SHALL display a transient error naming the remedy — which tool to install for the detected platform — and SHALL NOT paste anything.

#### Scenario: macOS reads via pbpaste
- **WHEN** the user pastes on macOS
- **THEN** the system SHALL run `pbpaste` with `LC_CTYPE=UTF-8` and use its stdout as the clipboard text

#### Scenario: Linux Wayland session prefers wl-paste
- **WHEN** `WAYLAND_DISPLAY` is set and `wl-paste` is available
- **THEN** the system SHALL run `wl-paste` and use its stdout as the clipboard text

#### Scenario: Missing clipboard tool shows actionable error
- **WHEN** the user pastes on Linux and none of `wl-paste`, `xclip`, `xsel` can be run
- **THEN** the status bar SHALL show a transient error mentioning the tools to install
- **AND** the request list SHALL be unchanged

### Requirement: Parse a single curl command into a request
The system SHALL accept a single shell-style `curl` command: the first token (after trimming surrounding whitespace) SHALL be `curl`, and arguments SHALL be tokenized recognizing single-quoted, double-quoted, and unquoted forms, backslash escapes, and backslash-newline line continuations. Shell variable expansions SHALL NOT be performed — `$VAR` text is taken literally. From the supported flag subset the system SHALL build the request: the method from `-X`/`--request` (uppercased; defaulting to `GET`, or to `POST` when data or form-data flags are present without an explicit method, mirroring curl), `HEAD` from `-I`/`--head`, the URL from the positional argument or `--url`, one header per `-H`/`--header` argument split into name and value at the first colon, the request body from `-d`/`--data`/`--data-raw`/`--data-binary` string arguments (repeated data flags concatenated with `&`, mirroring curl), and form-data text fields from `-F`/`--form`/`--form-string` arguments of the form `key=value`. A `-H` argument without a colon SHALL be skipped with a warning. When both data flags and form flags are present, the form-data fields SHALL win and the data flags SHALL be skipped with a warning.

#### Scenario: Simple GET command
- **WHEN** the clipboard contains `curl 'https://api.example.com/users'`
- **THEN** the pasted request SHALL have method `GET` and url `https://api.example.com/users`

#### Scenario: Quoting and line continuations are decoded
- **WHEN** the clipboard contains a command with single-quoted and double-quoted arguments joined by backslash-newline continuations
- **THEN** the arguments SHALL be tokenized as the shell would and the pasted request SHALL reflect the decoded values

#### Scenario: POST with headers and body
- **WHEN** the clipboard contains `curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json' --data-raw '{"name":"Alice"}'`
- **THEN** the pasted request SHALL have method `POST`, header `Content-Type: application/json`, and body `{"name":"Alice"}`

#### Scenario: Repeated data flags concatenate
- **WHEN** the clipboard contains a command with `-d 'a=1'` and `-d 'b=2'`
- **THEN** the pasted request body SHALL be `a=1&b=2`

#### Scenario: HEAD from -I
- **WHEN** the clipboard contains `curl -I 'https://api.example.com'`
- **THEN** the pasted request SHALL have method `HEAD`

### Requirement: Silent conversion of representable flags
Flags whose effect a request can fully represent SHALL be converted without any warning: `-u`/`--user user:password` SHALL become an `Authorization: Basic <base64 of user:password>` header; `-b`/`--cookie` with a `name=value` string SHALL become a `Cookie` header; `--json <data>` SHALL become an `Accept: application/json` header, a `Content-Type: application/json` header, and the request body; `-A`/`--user-agent` SHALL become a `User-Agent` header; `-e`/`--referer` SHALL become a `Referer` header. `-u` without a colon (curl would prompt for a password) and `-b`/`--json` referencing a file (`@file`) SHALL be skipped with a warning instead of converted.

#### Scenario: Basic auth converts to a header
- **WHEN** the clipboard contains `curl -u 'alice:secret' 'https://api.example.com'`
- **THEN** the pasted request SHALL have header `Authorization: Basic <base64 of alice:secret>`
- **AND** no warning SHALL be shown for the conversion

#### Scenario: Cookie string converts to a header
- **WHEN** the clipboard contains `curl -b 'session=abc' 'https://api.example.com'`
- **THEN** the pasted request SHALL have header `Cookie: session=abc`

#### Scenario: --json sets headers and body
- **WHEN** the clipboard contains `curl --json '{"a":1}' 'https://api.example.com'`
- **THEN** the pasted request SHALL have headers `Accept: application/json` and `Content-Type: application/json` and body `{"a":1}`

#### Scenario: User agent converts to a header
- **WHEN** the clipboard contains `curl -A 'Mozilla/5.0' 'https://api.example.com'`
- **THEN** the pasted request SHALL have header `User-Agent: Mozilla/5.0` and no warning SHALL be shown

#### Scenario: Data flags without an explicit method default to POST
- **WHEN** the clipboard contains `curl -d 'a=1' 'https://api.example.com'`
- **THEN** the pasted request SHALL have method `POST` and body `a=1`

#### Scenario: Passwordless -u is skipped with warning
- **WHEN** the clipboard contains `curl -u 'alice' 'https://api.example.com'`
- **THEN** the pasted request SHALL have no `Authorization` header and a warning SHALL be shown

### Requirement: Warn and skip unsupported curl capabilities
Any curl capability outside the supported and convertible subsets SHALL be skipped and SHALL NOT prevent the rest of the command from being imported — the same warn-and-continue semantics as Postman collection imports. This includes `--location`/`-L`, `--insecure`/`-k`, the TLS certificate flags (`--cert`, `--key`, `--cacert`, `--pass`), `--proxy`, `-G`/`--data-urlencode`, `--upload-file`, `--compressed`, HTTP version flags, timeout flags, output/cosmetic flags (`-s`, `-S`, `-v`, `--silent`, `--verbose`), `@file` references in data flags, form fields with `@file`/`<file` values, and unknown flags. The warning SHALL be a summary without per-flag detail: `Pasted request — some curl options were skipped`. On a paste with nothing skipped, the system SHALL instead show a transient success message `Pasted request`.

#### Scenario: Skipped flag still imports the request
- **WHEN** the clipboard contains `curl --location -X POST 'https://api.example.com' -H 'X-Api-Key: k' -v --compressed`
- **THEN** the request SHALL be appended with method `POST`, url `https://api.example.com`, and header `X-Api-Key: k`
- **AND** the status bar SHALL show the warning `Pasted request — some curl options were skipped`

#### Scenario: Clean paste shows success
- **WHEN** the clipboard contains only supported and convertible flags
- **THEN** the request SHALL be appended and the status bar SHALL show `Pasted request`

#### Scenario: Form-data file field skipped, text fields kept
- **WHEN** the clipboard contains `-F 'username=alice' -F 'avatar=@/tmp/a.png'`
- **THEN** the pasted request SHALL contain the `username` text field and SHALL NOT contain the `avatar` field
- **AND** the warning SHALL be shown

#### Scenario: Data file reference skipped
- **WHEN** the clipboard contains `curl --data '@payload.json' 'https://api.example.com'`
- **THEN** the pasted request SHALL have no body, the rest of the command SHALL be imported, and the warning SHALL be shown

### Requirement: Refuse non-importable clipboard content
The system SHALL refuse — without modifying the request list and with a transient error naming the reason — a clipboard whose trimmed content is empty, does not start with the `curl` command, contains more than one shell command (`&&`, `||`, `;`, `|`, `--next`, or a second `curl`), contains more than one positional URL, contains no URL at all, or names an HTTP method outside the supported method set. Refusal errors SHALL be specific to the reason (for example naming the unsupported method).

#### Scenario: Non-curl clipboard refused
- **WHEN** the clipboard contains `SELECT * FROM users;`
- **THEN** the status bar SHALL show a transient error stating the clipboard is not a curl command
- **AND** the request list SHALL be unchanged

#### Scenario: Chained commands refused
- **WHEN** the clipboard contains `curl 'https://a.example.com' && curl 'https://b.example.com'`
- **THEN** the system SHALL show a transient error about multiple commands
- **AND** the request list SHALL be unchanged

#### Scenario: Unsupported method refused
- **WHEN** the clipboard contains `curl -X PROPFIND 'https://api.example.com'`
- **THEN** the system SHALL show a transient error naming `PROPFIND` as unsupported
- **AND** the request list SHALL be unchanged

#### Scenario: Missing URL refused
- **WHEN** the clipboard contains `curl -X POST -H 'A: b'`
- **THEN** the system SHALL show a transient error about the missing URL
- **AND** the request list SHALL be unchanged

### Requirement: Append placement, name derivation, and unsaved marking
A pasted request SHALL be appended after the last request in the request list, the selection SHALL move to it, and its name SHALL be derived from the parsed request as the method and URL path — `METHOD /path` — with the query string, scheme, and host omitted and an empty path rendered as `/`. The pasted request SHALL be marked as unsaved so the existing save flows persist it: saving as `.http` SHALL include it, and in-place save SHALL append it to the source file as a new request block.

#### Scenario: Pasted request appended and selected
- **WHEN** a valid curl command is pasted into a list of 3 requests
- **THEN** the request list SHALL contain 4 requests with the pasted request last and selected

#### Scenario: Name derived from URL path
- **WHEN** the clipboard contains `curl -X POST 'https://api.example.com/users/42?page=2'`
- **THEN** the pasted request's name SHALL be `POST /users/42`

#### Scenario: Empty path renders as slash
- **WHEN** the clipboard contains `curl 'https://api.example.com'`
- **THEN** the pasted request's name SHALL be `GET /`

#### Scenario: Pasted request persists through save
- **WHEN** a request is pasted and the user saves via the save-as flow
- **THEN** the saved `.http` file SHALL contain the pasted request

### Requirement: Round-trip with copy-as-curl
Pasting a command produced by the copy-as-curl capability SHALL reproduce the copied request: same method, URL, headers with the same order, body, and form-data text fields. Because TLS flags (`-k`, `--cert`, …) describe app-level settings rather than the request, their presence in the copied command SHALL at most produce the skipped-options warning, never a refusal or a changed request.

#### Scenario: Copy then paste preserves the request
- **WHEN** a request is copied as curl with `y` and the clipboard is pasted with `p`
- **THEN** the appended request SHALL have the same method, URL, headers, body, and form-data text fields as the original

### Requirement: Paste shortcut binding
The system SHALL bind the `p` key in normal mode to paste a curl command from the clipboard. The `p` key SHALL NOT trigger when the application is in any other mode (`fileLoad`, `search`, `envSelect`, `saveLoad`, `edit`, `confirmDiscard`, `confirmInPlaceSave`) or while the help overlay is open.

#### Scenario: Press p in normal mode pastes from clipboard
- **WHEN** the application is in normal mode and the user presses `p`
- **THEN** the system SHALL read the clipboard and run the paste flow

#### Scenario: Press p in edit mode inserts nothing
- **WHEN** the application is in edit mode and the user presses `p`
- **THEN** the `p` SHALL be handled as edit-mode input and SHALL NOT trigger a paste

#### Scenario: Press p while help is open does nothing
- **WHEN** the help overlay is open and the user presses `p`
- **THEN** no paste SHALL occur
