# httptui

Interactive terminal UI for .http files.

<!-- TODO: Add screenshot/demo GIF -->

httptui is a fast, keyboard-driven REST client that lives in your terminal. It parses `.http` and `.rest` files, allowing you to browse and execute requests without leaving your workflow.

## Features

- **Interactive TUI**: Split-panel layout with request list and response viewer.
- **Keyboard First**: Navigate, send requests, and toggle views entirely with shortcuts.
- **Variable Support**: Use file-level, system, and environment variables.
- **Response Inspection**: Colorized status codes, headers, and pretty-printed JSON.
- **Fast**: Built with Ink and undici for a lightweight, responsive experience.

## Installation

```bash
npm install -g httptui
```

## Usage

```bash
httptui path/to/api.http
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `k` | Select previous request / Scroll response up |
| `↓` / `j` | Select next request / Scroll response down |
| `Enter` | Send currently selected request |
| `Tab` | Switch focus between panels |
| `v` | Toggle verbose mode (show/hide headers) |
| `r` | Toggle raw mode (no JSON formatting) |
| `?` | Toggle help overlay |
| `q` | Quit application |

## .http File Format

httptui supports a subset of the standard `.http` format used by VS Code REST Client.

### Request Separation
Use `###` to separate multiple requests in a single file. You can add an optional name after the separator.

```http
### Get all users
GET https://api.example.com/users
```

### Headers and Body
Headers follow the request line. A blank line separates headers from the request body.

```http
POST https://api.example.com/users
Content-Type: application/json

{
  "name": "John Doe"
}
```

### Variables

#### File Variables
Define variables at the top of your file using `@name = value`. Reference them with `{{name}}`.

```http
@hostname = api.example.com
GET https://{{hostname}}/users
```

#### System Variables
- `{{$timestamp}}`: Current Unix timestamp.
- `{{$guid}}`: Random UUID v4.
- `{{$randomInt min max}}`: Random integer between min and max.

#### Environment Variables
- `{{$processEnv VAR_NAME}}`: Read from your shell environment.
- `{{$dotenv VAR_NAME}}`: Read from a `.env` file in the current directory.

## Examples

Here is a basic example showing common request types:

```http
### Get all users
GET https://jsonplaceholder.typicode.com/users

### Get user by ID
GET https://jsonplaceholder.typicode.com/users/1

### Create a new user
POST https://jsonplaceholder.typicode.com/users
Content-Type: application/json

{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com"
}

### Update user
PUT https://jsonplaceholder.typicode.com/users/1
Content-Type: application/json

{
  "name": "Jane Doe",
  "username": "janedoe",
  "email": "jane@example.com"
}

### Delete user
DELETE https://jsonplaceholder.typicode.com/users/1
```

## Tech Stack

- **TypeScript**: Type-safe development.
- **Ink**: React-based framework for building interactive CLIs.
- **React**: Component-based UI architecture.
- **undici**: Modern, high-performance HTTP client for Node.js.
