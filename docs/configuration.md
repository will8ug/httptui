# Configuration

httptui loads configuration from two sources: a global config file and an optional project-level sidecar file.

## Global Config

- **macOS/Linux**: `~/.config/httptui/config.json`
- **Windows**: `%APPDATA%\httptui\config.json`

Paths starting with `~` expand to your home directory. Relative paths resolve against the global config directory.

You can override the global config location using the `HTTP_TUI_CONFIG` environment variable:

```bash
HTTP_TUI_CONFIG=/path/to/custom-config.json httptui api.http
```

## Project-Level Config

You can also place a `.httptui.json` file in the same directory as your `.http` file. This is useful for sharing request collections in teams or keeping project-specific certificates alongside your code.

## Precedence

Project config values override global config values for all top-level keys. For example, if both files define `certificates`, the project's `certificates` completely replace the global ones for that session.

## Relative Path Resolution

- **Global config**: Relative paths resolve against the global config directory (`~/.config/httptui/`).
- **Project config**: Relative paths resolve against the directory containing the `.httptui.json` file.

## Related

- [Environments](environments.md) — Register and switch named environments.
- [Client Certificates](certificates.md) — Configure mTLS client certificates.
