## MODIFIED Requirements

### Requirement: Resolution order
Variables SHALL be resolved in two passes: first file variables (which may reference system/env variables), then system and environment variables for each request. When an environment file is loaded via `--env` or `--env-name`, file variables and collection variables SHALL take precedence over environment file variables of the same name. Environment file variables SHALL serve as a base layer that file/collection variables can override.

#### Scenario: File variable referencing system variable
- **WHEN** a file variable is declared as `@ts = {{$timestamp}}`
- **THEN** the system variable SHALL be resolved after the file variable map is built, so the timestamp reflects resolution time rather than parse time

#### Scenario: File variable takes precedence over environment overlay
- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and an environment file defines `baseUrl = "https://api.dev.com"` via `--env`
- **THEN** the `{{baseUrl}}` placeholder SHALL resolve to `https://api.local` (file value, not environment value)

#### Scenario: Collection variable takes precedence over environment overlay
- **WHEN** a Postman collection defines `baseUrl = "https://api.example.com"` and an environment file defines `baseUrl = "https://api.staging.com"` via `--env`
- **THEN** the `{{baseUrl}}` placeholder SHALL resolve to `"https://api.example.com"` (collection value, not environment value)

#### Scenario: Environment variable used when no file variable exists
- **WHEN** an environment file defines `apiKey = "dev-key-123"` and no file or collection variable named `apiKey` exists
- **THEN** the `{{apiKey}}` placeholder SHALL resolve to `"dev-key-123"` (environment value used as base layer)
