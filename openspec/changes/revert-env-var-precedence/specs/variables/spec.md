## MODIFIED Requirements

### Requirement: Resolution order
Variables SHALL be resolved in two passes: first file variables (which may reference system/env variables), then system and environment variables for each request. When an environment file is loaded via `--env` or `--env-name`, environment file variables SHALL take precedence over file variables and collection variables of the same name. File and collection variables SHALL serve as a base layer that environment variables can override.

#### Scenario: File variable referencing system variable
- **WHEN** a file variable is declared as `@ts = {{$timestamp}}`
- **THEN** the system variable SHALL be resolved after the file variable map is built, so the timestamp reflects resolution time rather than parse time

#### Scenario: Environment variable takes precedence over file variable
- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and an environment file defines `baseUrl = "https://api.dev.com"` via `--env`
- **THEN** the `{{baseUrl}}` placeholder SHALL resolve to `https://api.dev.com` (environment value, not file value)

#### Scenario: Environment variable takes precedence over collection variable
- **WHEN** a Postman collection defines `baseUrl = "https://api.example.com"` and an environment file defines `baseUrl = "https://api.staging.com"` via `--env`
- **THEN** the `{{baseUrl}}` placeholder SHALL resolve to `"https://api.staging.com"` (environment value, not collection value)

#### Scenario: File variable used when no environment variable exists
- **WHEN** a `.http` file declares `@apiKey = abc123` and no environment file defines a variable named `apiKey`
- **THEN** the `{{apiKey}}` placeholder SHALL resolve to `abc123` (file value used as base layer)
