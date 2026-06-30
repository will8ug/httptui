## ADDED Requirements

### Requirement: Request list shows resolved request paths

The request-list panel SHALL resolve file, system, and environment variables against the current variable map before extracting the display path for each request. The displayed entry SHALL be `METHOD <path>` where `<path>` is the pathname (plus search string, if any) of the resolved URL. Resolution SHALL use the same merged variable map (`fileVariables` merged with the active environment's variables) used by the request-details panel and the send-request path, so that the list, the details panel, and the send path display a consistent URL.

#### Scenario: File variable resolved in request list

- **WHEN** a `.http` file declares `@baseUrl = https://api.example.com` and contains `GET {{baseUrl}}/posts`
- **THEN** the request-list entry SHALL display `GET /posts` (the pathname of the resolved URL), not `GET {{baseUrl}}/posts`

#### Scenario: Nested file variable resolved in request list

- **WHEN** a `.http` file declares `@hostname = api.example.com` and `@baseUrl = https://{{hostname}}` and contains `GET {{baseUrl}}/posts`
- **THEN** the request-list entry SHALL display `GET /posts`, demonstrating that nested file variables are resolved before display

#### Scenario: Request list reacts to environment switch

- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and an environment file loaded via `--env` or the `E` switcher defines `baseUrl = https://api.dev.com`
- **THEN** the request-list entry SHALL display the pathname of `https://api.dev.com/...` while that environment is active, and SHALL update to display the pathname of `https://api.local/...` when the user reverts to `(none)` via the environment switcher, without reloading the file

#### Scenario: Request list reacts to file reload

- **WHEN** the user presses `R` to reload the file and the reloaded file changes a variable definition (e.g. `@baseUrl` from `https://a.com` to `https://b.com`)
- **THEN** the request-list entries SHALL display pathnames resolved against the new variable values

#### Scenario: Unresolved variable preserves current display behavior

- **WHEN** a request URL contains `{{unknownVar}}` and no file or environment variable defines `unknownVar`
- **THEN** `resolveVariables` SHALL leave `{{unknownVar}}` in the URL, `new URL()` SHALL fail to parse it, and the request-list entry SHALL display `METHOD {{unknownVar}}/...` (the raw URL fallback), matching the behavior prior to this change

#### Scenario: Unresolved system variable preserves current display behavior

- **WHEN** a request URL contains `{{$processEnv DEFINITELY_NOT_SET}}` and that environment variable is unset
- **THEN** the placeholder SHALL be left in the URL, and the request-list entry SHALL display the raw URL string, matching the behavior prior to this change

#### Scenario: Request list horizontal scroll width matches rendered text

- **WHEN** the request list contains requests whose resolved path is longer or shorter than the raw URL, and the user presses `0`, `$`, `←`, or `→`
- **THEN** the horizontal scroll bounds SHALL be computed against the resolved path lengths, so the scrollable range matches what is rendered in the panel

#### Scenario: Request list resolution matches send path for dotenv

- **WHEN** a request URL contains `{{$dotenv API_HOST}}` and a `.env` file exists in the same directory as the loaded `.http` file
- **THEN** the request-list display SHALL resolve `{{$dotenv API_HOST}}` using the `.env` file in the loaded file's directory first (then CWD fallback), identical to the resolution used when the request is sent, so the displayed path matches the sent URL