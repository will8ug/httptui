## MODIFIED Requirements

### Requirement: File variables take precedence over environment variables
When an environment file is loaded via `--env` or `--env-name`, file variables and collection variables SHALL take precedence over environment file variables of the same name during resolution. Environment file variables SHALL serve as a base layer providing defaults that file/collection variables can override. System variables (`{{$timestamp}}`, `{{$processEnv}}`, etc.) SHALL still be resolved in the second pass.

#### Scenario: File variable overrides environment variable
- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and the environment file defines `baseUrl = "https://api.dev.com"`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `https://api.local` (file value wins)

#### Scenario: Collection variable overrides environment variable
- **WHEN** a Postman collection defines `baseUrl = "https://api.example.com"` and the environment file defines `baseUrl = "https://api.staging.com"`
- **THEN** requests containing `{{baseUrl}}` SHALL resolve to `"https://api.example.com"` (collection value wins)

#### Scenario: Environment variable used as default when no file variable exists
- **WHEN** an environment file defines `apiKey = "dev-key-123"` and no file or collection variable named `apiKey` exists
- **THEN** requests containing `{{apiKey}}` SHALL resolve to `"dev-key-123"` (environment value serves as base)

#### Scenario: Environment variable does not affect system variables
- **WHEN** an environment file has no variable named `timestamp` and a request contains `{{$timestamp}}`
- **THEN** the system variable SHALL still resolve to the current Unix timestamp
