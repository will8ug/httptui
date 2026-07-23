# Environments

httptui supports two ways to work with environment variables: loading environment files at startup, and registering named environments you can switch between at runtime.

## Environment Files

Load environment files with the `--env` / `-e` flag. httptui supports both Postman environment files (`.postman_environment.json`) and a simplified format. Environment variables override file-level and collection-level variables of the same name. This works for both `.http` files and Postman collections.

```bash
httptui collection.json --env dev.postman_environment.json
httptui api.http -e staging.json
```

**Simplified format** (compatible with Postman, but without Postman-specific metadata):

```json
{
  "name": "Development",
  "values": [
    { "key": "baseUrl", "value": "https://api.dev.com", "enabled": true },
    { "key": "apiKey", "value": "dev-secret-key", "enabled": true }
  ]
}
```

The `enabled` field is optional and defaults to `true`. Disabled variables are skipped. The `type` field is ignored (no secret masking).

## Environment Configuration

You can register environment files in your global or project-level config file and reference them by name using the `--env-name` / `-E` flag.

```json
{
  "environments": [
    { "name": "Development", "file": "env/dev.json" },
    { "name": "Staging", "file": "env/staging.json" }
  ]
}
```

Relative paths are resolved against the config directory. If both global and project configs define `environments`, the project config replaces the global one entirely.

See [Configuration](configuration.md) for global and project config file locations and precedence rules.

## Runtime Environment Switcher

Press `E` while the TUI is running to open the environment picker.

- The picker lists all environments registered in your configuration files.
- If you launched httptui with the `--env` flag, that file's name (or basename) is also included in the list.
- Use `↑`/`↓` or `j`/`k` to navigate the list. Press `g` to jump to the top or `G` to jump to the bottom.
- The picker shows at most 8 options at a time (including `(none)`); the list scrolls automatically as you move the highlight. On short terminals, fewer rows are shown to fit the screen.
- Press `Enter` to apply the selected environment or `Esc` to cancel.
- Selecting the `(none)` option reverts to using only file-level variables.
- The active environment name is displayed in the status bar.
