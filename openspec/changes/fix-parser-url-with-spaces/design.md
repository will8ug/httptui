## Context

The `.http` file parser in `src/core/parser.ts` uses `parseRequestLine` to extract HTTP method and URL from each request line. The current regex is:

```
/^([A-Za-z]+)\s+(\S+)(?:\s+HTTP\/\S+)?$/
```

The `(\S+)` group for the URL requires the URL to contain no whitespace. However, the VS Code REST Client spec supports `{{...}}` variable expressions that can contain spaces (e.g., `{{$randomInt 1 100}}`). When such an expression appears in a URL, the entire request line fails to parse and the request is silently dropped.

Example that fails: `GET {{baseUrl}}/posts/{{$randomInt 1 100}}`

## Goals / Non-Goals

**Goals:**
- Parse request lines where the URL contains `{{...}}` expressions with space-separated arguments
- Maintain backward compatibility with all existing valid `.http` files

**Non-Goals:**
- Support for arbitrary whitespace in URLs outside `{{...}}` expressions
- Changes to how variables are resolved (already working correctly)
- Changes to the `.http` file format or separator logic

## Decisions

1. **Use a regex that allows `{{...}}` with spaces in the URL** — Change the URL capture group from `\S+` to a pattern that matches characters and `{{...}}` expressions containing spaces. The pattern `(?:\{\{[^}]*\}\}|[^\s])+` matches either a `{{...}}` token (which may contain spaces) or a non-space character, one or more times. This preserves the constraint that bare spaces end the URL while allowing spaces inside `{{...}}`.

   Alternative considered: capturing everything after the method as the URL and trimming trailing `HTTP/x.x` suffixes. This was rejected because it's more fragile — it could accidentally capture comment text or other trailing content.

## Risks / Trade-offs

- **Regex complexity** → The new pattern is slightly more complex but well-bounded. It only affects the URL portion and the `{{...}}` syntax is unambiguous (double braces are not valid in URLs outside variables).
- **Edge case: nested braces** → `{{}}` or `{{{{}}}` patterns. These are not valid variable expressions and would not be used in practice. The regex `[^}]*` inside `{{...}}` handles the common case of `{{$randomInt 1 100}}` correctly.