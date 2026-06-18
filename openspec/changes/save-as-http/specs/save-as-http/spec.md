## ADDED Requirements

### Requirement: Serialize requests to .http file text
The system SHALL provide a pure function `serializeHttpFile(requests: ParsedRequest[], variables: FileVariable[]): string` that converts the in-memory request and variable model into `.http` file text matching the format the existing `parseHttpFile` parser accepts. Each request SHALL be emitted as a `### <name>` separator line, followed by a `<METHOD> <url>` request line, followed by one `Header-Name: value` line per header, followed by a blank line and the body (if present). Requests SHALL be separated by a blank line. The `lineNumber` field SHALL NOT be serialized. The `name` field SHALL be written verbatim after `###`, including any ` / ` folder-prefix characters from Postman flattening.

#### Scenario: Serialize a single GET request with no headers or body
- **WHEN** `serializeHttpFile` is called with one request having name "Get Users", method `GET`, url `https://api.example.com/users`, empty headers, and no body
- **THEN** the output SHALL contain `### Get Users\nGET https://api.example.com/users\n`

#### Scenario: Serialize a POST request with headers and body
- **WHEN** `serializeHttpFile` is called with one request having name "Create User", method `POST`, url `https://api.example.com/users`, headers `{ "Content-Type": "application/json" }`, and body `{"name":"Alice"}`
- **THEN** the output SHALL contain `### Create User\nPOST https://api.example.com/users\nContent-Type: application/json\n\n{"name":"Alice"}`

#### Scenario: Serialize multiple requests separated by blank lines
- **WHEN** `serializeHttpFile` is called with two requests
- **THEN** the output SHALL separate the two request blocks with a blank line

#### Scenario: Serialize a request with no headers and no body produces no blank line after request line
- **WHEN** `serializeHttpFile` is called with one GET request having empty headers and no body
- **THEN** the request line SHALL be immediately followed by a newline, with no extra blank line before the body (since there is no body)

#### Scenario: Serialize preserves variable placeholders in URL
- **WHEN** a request has url `https://{{hostname}}/users`
- **THEN** the serialized request line SHALL contain `{{hostname}}` verbatim (not resolved)

#### Scenario: Serialize preserves variable placeholders in body
- **WHEN** a request has body `{"title":"Post {{$timestamp}}"`
- **THEN** the serialized body SHALL contain `{{$timestamp}}` verbatim (not resolved)

### Requirement: Serialize file variables as @name declarations
The system SHALL emit file-level variables as `@name = value` lines at the top of the output, one per `FileVariable`, before any request block. Variables SHALL be separated from the first request by a blank line.

#### Scenario: Serialize file with variables and requests
- **WHEN** `serializeHttpFile` is called with variables `[{name: "hostname", value: "api.example.com"}]` and one request
- **THEN** the output SHALL start with `@hostname = api.example.com\n\n` followed by the first request block

#### Scenario: Serialize with no variables produces no @ lines
- **WHEN** `serializeHttpFile` is called with an empty variables array
- **THEN** the output SHALL NOT contain any `@` variable declaration lines

### Requirement: Omit form-data bodies with an inline comment
When a `ParsedRequest` has `formdataFields` present and `body` is `undefined`, the serializer SHALL emit a `# form-data body omitted (N text fields: <comma-separated keys>)` comment line after the headers (in place of the body). The `Content-Type: multipart/form-data` header SHALL be omitted from the output (since there is no body to match it). The comment SHALL list each field key in order.

#### Scenario: Serialize request with text-only form-data fields
- **WHEN** a request has `formdataFields` `[{key: "username", value: "alice", type: "text"}, {key: "email", value: "alice@example.com", type: "text"}]`, body `undefined`, and headers including `Content-Type: multipart/form-data`
- **THEN** the serialized output SHALL contain a comment `# form-data body omitted (2 text fields: username, email)` in place of the body
- **AND** the output SHALL NOT contain a `Content-Type: multipart/form-data` header line

#### Scenario: Serialize request with no form-data fields and a normal body
- **WHEN** a request has no `formdataFields` and body `{"name":"Alice"}`
- **THEN** the serialized output SHALL contain the body verbatim with no omission comment

### Requirement: Round-trip through parser preserves request data
The output of `serializeHttpFile` SHALL be parseable by `parseHttpFile` and SHALL produce a `ParseResult` whose requests match the original input in name, method, url, headers, and body (form-data fields excepted, as they are omitted by design).

#### Scenario: Round-trip a request with headers and raw body
- **WHEN** a `ParsedRequest` with method `POST`, url `https://api.example.com/users`, headers `{ "Content-Type": "application/json" }`, and body `{"name":"Alice"}` is serialized and then parsed by `parseHttpFile`
- **THEN** the re-parsed request SHALL have the same method, url, headers, and body

#### Scenario: Round-trip preserves file variables
- **WHEN** a `FileVariable` with name `hostname` and value `api.example.com` is serialized and then parsed by `parseHttpFile`
- **THEN** the re-parsed variables SHALL include a variable with name `hostname` and value `api.example.com`

### Requirement: Save overlay default path derivation
When the user presses `S` in normal mode, the system SHALL enter save mode and pre-fill the save input with a default path derived from the currently loaded file path. The default SHALL replace the loaded file's extension with `.http`, preserving the directory and basename. For a loaded file `path/to/My Collection.json`, the default SHALL be `path/to/My Collection.http`. For a loaded file `path/to/api.http`, the default SHALL be `path/to/api.http`.

#### Scenario: Default path for a Postman collection
- **WHEN** the loaded file is `/home/user/collections/MyAPI.json` and the user presses `S`
- **THEN** the save overlay input SHALL be pre-filled with `/home/user/collections/MyAPI.http`

#### Scenario: Default path for a .http file
- **WHEN** the loaded file is `/home/user/apis/test.http` and the user presses `S`
- **THEN** the save overlay input SHALL be pre-filled with `/home/user/apis/test.http`

### Requirement: Save overlay path input and confirmation
The save overlay SHALL display the current input value and allow the user to modify it via keyboard input (typing characters, backspace to delete). The user SHALL press `Enter` to confirm the save or `Escape` to cancel. The entered path MAY be absolute or relative. If relative, the system SHALL resolve it against the directory of the currently loaded file (`path.dirname(state.filePath)`). If absolute, the system SHALL use it directly.

#### Scenario: Confirm save with an absolute path
- **WHEN** the user types `/tmp/output.http` and presses `Enter`
- **THEN** the system SHALL attempt to write the serialized content to `/tmp/output.http`

#### Scenario: Confirm save with a relative path
- **WHEN** the loaded file is `/home/user/collections/MyAPI.json`, the user types `exports/api.http` and presses `Enter`
- **THEN** the system SHALL resolve the path to `/home/user/collections/exports/api.http` and attempt to write there

#### Scenario: Cancel save with Escape
- **WHEN** the user presses `Escape` while the save overlay is open
- **THEN** the system SHALL close the overlay and return to normal mode without writing any file

### Requirement: File-name conflict auto-suffix
When the resolved target path already exists, the system SHALL NOT overwrite it. The system SHALL append ` - N` to the basename (before the extension) and increment `N` starting from `1` until a non-existing path is found. The system SHALL write to the first available path without prompting the user for confirmation. The actual saved path (which may differ from the user's input) SHALL be reflected in the confirmation message.

#### Scenario: Target path does not exist
- **WHEN** the resolved target path is `/tmp/api.http` and no file exists at that path
- **THEN** the system SHALL write to `/tmp/api.http` directly

#### Scenario: Target path exists, first suffix is free
- **WHEN** the resolved target path is `/tmp/api.http` and `/tmp/api.http` already exists, but `/tmp/api - 1.http` does not
- **THEN** the system SHALL write to `/tmp/api - 1.http`

#### Scenario: Target path and first suffix both exist
- **WHEN** the resolved target path is `/tmp/api.http`, and both `/tmp/api.http` and `/tmp/api - 1.http` exist, but `/tmp/api - 2.http` does not
- **THEN** the system SHALL write to `/tmp/api - 2.http`

### Requirement: Save confirmation transient message
On successful write, the system SHALL display a transient status message indicating the number of requests saved and the actual file path written. The message SHALL use the existing `SET_TRANSIENT_MESSAGE` / `CLEAR_TRANSIENT_MESSAGE` mechanism and SHALL clear after the existing transient timeout.

#### Scenario: Successful save shows confirmation
- **WHEN** the serializer produces text for 5 requests and the file is written to `/tmp/api.http`
- **THEN** the status bar SHALL display a transient message like "Saved 5 requests to /tmp/api.http"

#### Scenario: Successful save with conflict suffix shows actual path
- **WHEN** the file is written to `/tmp/api - 1.http` due to a conflict
- **THEN** the transient message SHALL show "Saved 5 requests to /tmp/api - 1.http" (the actual path, not the user's input)

### Requirement: Save error handling
If the write fails (e.g., permission denied, invalid path), the system SHALL display an error message in the save overlay (not a transient message) and SHALL keep the overlay open so the user can correct the path and retry. The error SHALL be cleared when the user modifies the input.

#### Scenario: Write fails with permission error
- **WHEN** the user confirms a path that the process cannot write to (e.g., `/root/api.http` without permissions)
- **THEN** the save overlay SHALL display the error message inline and SHALL remain open

#### Scenario: Error clears on input change
- **WHEN** an error is displayed in the save overlay and the user types or deletes a character
- **THEN** the error message SHALL be cleared

### Requirement: Save shortcut binding
The system SHALL bind the `S` key in normal mode to enter save mode. The `S` key SHALL NOT trigger when the application is in any other mode (`fileLoad`, `search`, `envSelect`, `saveLoad`). The `S` key SHALL NOT be bound to any other action in normal mode.

#### Scenario: Press S in normal mode enters save mode
- **WHEN** the application is in normal mode and the user presses `S`
- **THEN** the system SHALL enter save mode and display the save overlay

#### Scenario: Press S in save mode does nothing
- **WHEN** the application is already in save mode and the user presses `S`
- **THEN** the system SHALL NOT trigger a second save-mode entry (the `S` key is handled as input text, not as a command)
