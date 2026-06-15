## MODIFIED Requirements

### Requirement: Environment variables take precedence over file variables
When an environment file is loaded via `--env` or `--env-name`, environment file variables SHALL take precedence over file variables and collection variables of the same name during resolution. File and collection variables SHALL serve as a base layer that environment variables can override. System variables (`{{$timestamp}}`, `{{$processEnv}}`, etc.) SHALL still be resolved in the second pass.

#### Scenario: Environment variable overrides file variable
- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and the environment file defines `baseUrl = "https://api.dev.com"`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `https://api.dev.com` (environment value wins)

#### Scenario: Environment variable overrides collection variable
- **WHEN** a Postman collection defines `baseUrl = "https://api.example.com"` and the environment file defines `baseUrl = "https://api.staging.com"`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `"https://api.staging.com"` (environment value wins)

#### Scenario: File variable used as default when no environment variable exists
- **WHEN** a `.http` file declares `@apiKey = abc123` and no environment file defines a variable named `apiKey`
- **THEN** requests containing `{{apiKey}}` SHALL resolve to `abc123` (file value serves as base)

#### Scenario: Environment variable does not affect system variables
- **WHEN** an environment file has no variable named `timestamp` and a request contains `{{$timestamp}}`
- **THEN** the system variable SHALL still resolve to the current Unix timestamp
