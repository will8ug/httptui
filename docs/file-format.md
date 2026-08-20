# .http File Format

httptui supports a subset of the standard `.http` format used by VS Code REST Client.

## Request Separation

Use `###` to separate multiple requests in a single file. You can add an optional name after the separator.

```http
### Get all users
GET https://api.example.com/users
```

## Headers and Body

Headers follow the request line. A blank line separates headers from the request body.

```http
### Post users
POST https://api.example.com/users
Content-Type: application/json

{
  "name": "John Doe"
}
```

## Variables

### File Variables

Define variables at the top of your file using `@name = value`. Reference them with `{{name}}`.

```http
@hostname = api.example.com
GET https://{{hostname}}/users
```

### System Variables

- `{{$timestamp}}`: Current Unix timestamp.
- `{{$guid}}`: Random UUID v4.
- `{{$randomInt min max}}`: Random integer between min and max.

### Environment Variables

- `{{$processEnv VAR_NAME}}`: Read from your shell environment.
- `{{$dotenv VAR_NAME}}`: Read from a `.env` file in the `.http` file's directory first, then fall back to the current working directory.

For loading environment files (Postman or simplified format) and registering named environments, see [Environments](environments.md).
