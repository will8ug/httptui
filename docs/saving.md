# Saving

httptui can persist requests to `.http` files in two ways.

## Save in place (Ctrl+S)

If the loaded file is a `.http` (or `.rest`) file, press `Ctrl+S` to write your edits back to that file. A confirmation prompt shows the file name and how many changed requests will be rewritten; press `y` to save, or `n`/`Escape` to cancel.

Only the request blocks you edited are rewritten — comments, variables, layout, and untouched requests stay exactly as they are. If you press `Ctrl+S` with no edits, the status bar shows `No changes to save`. In-place save is not available for Postman or OpenAPI sources; use `S` to export those as a new `.http` file.

## Save as .http (S)

Press `S` to save all requests as a `.http` file. A save overlay appears with a default path — `<collection-basename>.http` in the same directory as the loaded file. You can type a new path (absolute or relative to the loaded file's directory) and press `Enter` to save, or `Escape` to cancel.

If the target file already exists, the save is refused: the overlay shows an inline error and stays open so the path can be edited. No file is overwritten.

On a successful save, the app switches to the written file — the status bar shows its name, and `R` reloads it.

The saved `.http` file contains all requests with their names, methods, URLs, headers, and bodies. File-level variables are preserved as `@name = value` declarations, and `{{variable}}` placeholders are kept intact for round-trippability.

**Limitations**: Multipart form-data bodies (text fields) are omitted with an inline comment, as the `.http` format has no multipart syntax. GraphQL bodies, file uploads, and Postman scripts are already dropped during import and cannot be recovered. Postman folder structure is preserved as request names (e.g., `### Users / Create User`).
