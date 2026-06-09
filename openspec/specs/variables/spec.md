# Spec: Variable Resolution

## Purpose

Resolve `{{...}}` variable placeholders in URLs, headers, and request bodies. Two-pass resolution: file variables first, then system/env variables.

## Requirements

### Requirement: File variable resolution
File-level variables SHALL be declared with `@name = value` syntax and referenced as `{{name}}` (without the `@` prefix). File variables MAY reference other file variables and system variables. Resolution SHALL be simple string replacement.

#### Scenario: File variable declaration and reference
- **WHEN** a `.http` file contains `@hostname = api.example.com` and a request URL contains `{{hostname}}`
- **THEN** the `{{hostname}}` placeholder SHALL be replaced with `api.example.com`

### Requirement: System variable resolution
The parser SHALL support the following system variables: `{{$timestamp}}` (Unix timestamp in seconds), `{{$guid}}` (UUID v4), and `{{$randomInt min max}}` (random integer in range). `{{$randomInt}}` without arguments SHALL default to the range 0–1000.

#### Scenario: Timestamp variable resolution
- **WHEN** a request URL or header contains `{{$timestamp}}`
- **THEN** the placeholder SHALL be replaced with the current Unix timestamp in seconds

#### Scenario: RandomInt with range
- **WHEN** a request contains `{{$randomInt 1 100}}`
- **THEN** the placeholder SHALL be replaced with a random integer between 1 and 100

### Requirement: Environment variable resolution
The parser SHALL support `{{$processEnv VAR}}` to read from `process.env` and `{{$dotenv VAR}}` to read from a `.env` file. If a variable is not found, the placeholder SHALL be left as-is and a warning SHALL be logged.

#### Scenario: Process environment variable resolution
- **WHEN** a request header contains `{{$processEnv API_KEY}}` and `API_KEY` is set in `process.env`
- **THEN** the placeholder SHALL be replaced with the value of `API_KEY`

#### Scenario: Missing environment variable
- **WHEN** a request contains `{{$processEnv MISSING_VAR}}` and `MISSING_VAR` is not set in `process.env`
- **THEN** the placeholder SHALL be left as-is and a warning SHALL be logged

### Requirement: Resolution order
Variables SHALL be resolved in two passes: first file variables (which may reference system/env variables), then system and environment variables for each request. When an environment file is loaded via `--env`, environment file variables SHALL be applied as an overlay on top of file variables, taking precedence over file/collection variables of the same name.

#### Scenario: File variable referencing system variable
- **WHEN** a file variable is declared as `@ts = {{$timestamp}}`
- **THEN** the system variable SHALL be resolved after the file variable map is built, so the timestamp reflects resolution time rather than parse time

#### Scenario: Environment overlay takes precedence over file variable
- **WHEN** a `.http` file declares `@baseUrl = https://api.local` and an environment file defines `baseUrl = "https://api.dev.com"` via `--env`
- **THEN** the `{{baseUrl}}` placeholder SHALL resolve to `"https://api.dev.com"` (environment value, not file value)

#### Scenario: Environment overlay takes precedence over collection variable
- **WHEN** a Postman collection defines `baseUrl = "https://api.example.com"` and an environment file defines `baseUrl = "https://api.staging.com"` via `--env`
- **THEN** the `{{baseUrl}}` placeholder SHALL resolve to `"https://api.staging.com"` (environment value, not collection value)

### Requirement: Scope and freshness
File variables SHALL be scoped to the file (not shared across files). System variables SHALL be evaluated fresh each time they are resolved — `{{$guid}}` SHALL generate a new UUID each time, and `{{$timestamp}}` SHALL return the current time at resolution (not parse time).

#### Scenario: GUID generates unique values
- **WHEN** the same request is sent twice and both contain `{{$guid}}`
- **THEN** each resolution SHALL produce a different UUID

### Requirement: `{{$dotenv}}` fallback path
When reading a `.env` file, the parser SHALL first look in the same directory as the `.http` file, then fall back to the current working directory.

#### Scenario: Dotenv reads from file directory first
- **WHEN** a `.http` file at `/project/api/test.http` references `{{$dotenv DB_URL}}`
- **THEN** the parser SHALL first look for `/project/api/.env`, then fall back to the CWD `.env`