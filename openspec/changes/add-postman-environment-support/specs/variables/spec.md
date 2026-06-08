## MODIFIED Requirements

### Requirement: Resolution order
Variables SHALL be resolved in two passes: first file variables (which may reference system/env variables), then system and environment variables for each request. **When an environment file is loaded via `--env`, environment file variables SHALL be applied as an overlay on top of file variables, taking precedence over file/collection variables of the same name.**

#### Scenario: File variable referencing system variable with env overlay
- **WHEN** a file variable is declared as `@ts = {{$timestamp}}` and an environment file is loaded via `--env`
- **THEN** the file variable SHALL be built from the system variable, and the environment overlay SHALL be applied before request resolution

#### Scenario: Environment overlay takes precedence over file variable
- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and an environment file defines `baseUrl = "https://api.dev.com"` via `--env`
- **THEN** the `{{baseUrl}}` placeholder SHALL resolve to `"https://api.dev.com"` (environment value, not file value)

#### Scenario: Environment overlay takes precedence over collection variable
- **WHEN** a Postman collection defines `baseUrl = "https://api.example.com"` and an environment file defines `baseUrl = "https://api.staging.com"` via `--env`
- **THEN** the `{{baseUrl}}` placeholder SHALL resolve to `"https://api.staging.com"` (environment value, not collection value)
