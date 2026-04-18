# Spec: .http File Parser

## Purpose

Parse `.http` and `.rest` files into a structured array of `ParsedRequest` objects. The parser is a line-by-line state machine with zero external dependencies.

## Requirements

### Requirement: Request separation
The parser SHALL use `###` (three or more `#` characters) to separate requests. Text after `###` on the same line SHALL be the request name. The first request in a file SHALL NOT require a preceding `###`.

#### Scenario: Multiple requests separated by ### delimiter
- **WHEN** a `.http` file contains two requests separated by a `###` line
- **THEN** both requests SHALL be parsed as separate `ParsedRequest` objects

#### Scenario: Request name extracted from delimiter line
- **WHEN** a `###` line contains text after the hashes (e.g., `### Get all users`)
- **THEN** the text SHALL be used as the request name

### Requirement: File variables
File-level variables SHALL be declared with `@name = value` syntax outside any request block. Variable names SHALL be alphanumeric plus underscore. Values SHALL be trimmed. File variables MAY reference system variables.

#### Scenario: File variable declaration and reference
- **WHEN** a file contains `@hostname = api.example.com` and a request URL contains `{{hostname}}`
- **THEN** the `{{hostname}}` placeholder SHALL be replaced with `api.example.com`

### Requirement: Comments
Lines starting with `#` (but NOT `###`) SHALL be treated as comments and ignored. Lines starting with `//` SHALL also be treated as comments. Comments MAY appear anywhere in the file.

#### Scenario: Comment lines ignored
- **WHEN** a `.http` file contains `# this is a comment` and `// another comment`
- **THEN** both lines SHALL be ignored during parsing

## Input

A string (file content) containing one or more HTTP requests separated by `###`.

## Output

```typescript
interface ParsedRequest {
  name: string;           // from ### comment, or auto-generated "Request 1"
  method: HttpMethod;     // GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
  url: string;            // raw URL (variables not yet resolved)
  headers: Record<string, string>;
  body: string | undefined;
  lineNumber: number;     // line in source file where request starts
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

## Rules

### Request Separation
- `###` (three or more `#` characters) separates requests
- Text after `###` on the same line is the request name (trimmed)
- First request in file does not require a preceding `###`

### Request Line
- Format: `METHOD URL [HTTP/VERSION]`
- METHOD is case-insensitive, normalized to uppercase
- URL can contain `{{variable}}` placeholders, including expressions with space-separated arguments (e.g., `{{$randomInt 1 100}}`)
- HTTP version is optional and ignored (always use HTTP/1.1 via undici)

### Headers
- Format: `Header-Name: Header-Value`
- One header per line
- Continues until a blank line or `###` or EOF
- Duplicate header names: last value wins

### Body
- Everything after the first blank line following headers, until `###` or EOF
- Leading/trailing blank lines in body are trimmed
- If no blank line after headers, body is undefined

### Comments
- Lines starting with `#` (but NOT `###`) are comments — ignored
- Lines starting with `//` are comments — ignored
- Comments can appear anywhere: between requests, before headers, etc.

### File Variables
- Format: `@variableName = value`
- Declared at file level (outside any request)
- Name: alphanumeric + underscore
- Value: everything after `=` (trimmed)
- Can reference system variables: `@ts = {{$timestamp}}`

### Whitespace
- Blank lines separate headers from body
- Trailing whitespace on lines is trimmed
- Empty lines between `###` and request line are skipped

## Edge Cases

- Empty file → empty array
- File with only comments → empty array
- Request with no headers and no body → valid (just method + URL)
- Request with headers but no body → valid
- Multiple blank lines between headers and body → first blank line is the separator, rest are part of body (trimmed)
- `###` with no following request → ignored
- URL with query params → preserved as-is
