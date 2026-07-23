# Saving as .http

After opening a Postman collection (or any file), press `S` to save all requests as a `.http` file. A save overlay appears with a default path — `<collection-basename>.http` in the same directory as the loaded file. You can type a new path (absolute or relative to the loaded file's directory) and press `Enter` to save, or `Escape` to cancel.

If the target file already exists, a ` - N` suffix is automatically appended (e.g., `api - 1.http`) without confirmation.

The saved `.http` file contains all requests with their names, methods, URLs, headers, and bodies. File-level variables are preserved as `@name = value` declarations, and `{{variable}}` placeholders are kept intact for round-trippability.

**Limitations**: Multipart form-data bodies (text fields) are omitted with an inline comment, as the `.http` format has no multipart syntax. GraphQL bodies, file uploads, and Postman scripts are already dropped during import and cannot be recovered. Postman folder structure is preserved as request names (e.g., `### Users / Create User`).
