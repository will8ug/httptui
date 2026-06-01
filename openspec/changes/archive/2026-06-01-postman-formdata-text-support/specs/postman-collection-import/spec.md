## MODIFIED Requirements

### Requirement: Extract request body
The system SHALL extract the request body based on body mode. For `raw` mode, the raw string SHALL be used directly. For `urlencoded` mode, the key-value array SHALL be converted to a `key=val&key2=val2` string and a `Content-Type: application/x-www-form-urlencoded` header SHALL be injected. For `formdata` mode with only text fields (no file fields), the parser SHALL populate `formdataFields` on the parsed request with each field's key, value, and type. For `formdata` mode containing file fields, the parser SHALL log a warning and set body to `undefined`. For `file` and `graphql` modes, the parser SHALL log a warning and set body to `undefined`.

#### Scenario: Extract raw JSON body
- **WHEN** a Postman request has body mode `raw` with content `{"name": "Alice"}`
- **THEN** the parsed request SHALL have body `{"name": "Alice"}`

#### Scenario: Extract urlencoded body
- **WHEN** a Postman request has body mode `urlencoded` with fields `[{key: "name", value: "Alice"}, {key: "age", value: "30"}]`
- **THEN** the parsed request SHALL have body `name=Alice&age=30` and headers SHALL include `Content-Type: application/x-www-form-urlencoded`

#### Scenario: Extract text-only formdata body
- **WHEN** a Postman request has body mode `formdata` with fields `[{key: "username", value: "alice", type: "text"}, {key: "email", value: "alice@example.com", type: "text"}]`
- **THEN** the parsed request SHALL have `formdataFields` with two entries `[{key: "username", value: "alice", type: "text"}, {key: "email", value: "alice@example.com", type: "text"}]`, body SHALL be `undefined`, and headers SHALL include `Content-Type: multipart/form-data`

#### Scenario: Warn on formdata with file upload
- **WHEN** a Postman request has body mode `formdata` containing a file field with `type: "file"`
- **THEN** the parser SHALL log a warning to stderr and set body to `undefined`

#### Scenario: Request with no body
- **WHEN** a Postman request has body mode `raw` with empty content
- **THEN** the parsed request SHALL have body `undefined`