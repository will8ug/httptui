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
Variables SHALL be resolved in two passes: first file variables (which may reference system/env variables), then system and environment variables for each request.

#### Scenario: File variable referencing system variable
- **WHEN** a file variable is declared as `@ts = {{$timestamp}}`
- **THEN** the system variable SHALL be resolved after the file variable map is built, so the timestamp reflects resolution time rather than parse time

### Requirement: Scope and freshness
File variables SHALL be scoped to the file (not shared across files). System variables SHALL be evaluated fresh each time they are resolved — `{{$guid}}` SHALL generate a new UUID each time, and `{{$timestamp}}` SHALL return the current time at resolution (not parse time).

#### Scenario: GUID generates unique values
- **WHEN** the same request is sent twice and both contain `{{$guid}}`
- **THEN** each resolution SHALL produce a different UUID

## Variable Types

### 1. File Variables

```http
@hostname = api.example.com
@port = 3000
@baseUrl = https://{{hostname}}:{{port}}
```

- Declared with `@name = value` at file level
- Referenced as `{{name}}` (without `@`)
- Can reference other file variables and system variables
- Resolution: simple string replacement

### 2. System Variables

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{{$timestamp}}` | Unix timestamp (seconds) | `1712649600` |
| `{{$guid}}` | UUID v4 | `a1b2c3d4-e5f6-...` |
| `{{$randomInt min max}}` | Random integer in range | `42` |

- `{{$randomInt}}` without args defaults to 0-1000
- `{{$randomInt 1 100}}` — space-separated min max

### 3. Environment Variables

| Variable | Description |
|----------|-------------|
| `{{$processEnv VAR_NAME}}` | Read from process.env |
| `{{$dotenv VAR_NAME}}` | Read from `.env` file in CWD |

- `{{$processEnv}}` reads from `process.env`
- `{{$dotenv}}` reads from `.env` file in the same directory as the `.http` file, falling back to CWD
- If variable not found, leave placeholder as-is and log a warning

## Resolution Order

1. Parse all `@name = value` declarations → build variable map
2. Resolve file variable values (they may reference `{{$...}}` system vars)
3. For each request:
   a. Replace `{{name}}` with file variable values
   b. Replace `{{$...}}` with system/env values

## Scope

- File variables are scoped to the file (not shared across files)
- System variables are evaluated fresh each time they're resolved
- `{{$guid}}` generates a new UUID each time it appears (not cached)
- `{{$timestamp}}` returns the current time at resolution (not parse time)
