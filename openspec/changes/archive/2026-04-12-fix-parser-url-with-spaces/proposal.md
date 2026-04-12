## Why

The `.http` file parser's `parseRequestLine` function uses a regex that requires URLs to match `\S+` (no spaces). When a URL contains a `{{...}}` variable expression with space-separated arguments (e.g., `{{$randomInt 1 100}}`), the regex fails and the entire request is silently dropped from the list. This causes requests like `GET {{baseUrl}}/posts/{{$randomInt 1 100}}` to be skipped during parsing, with no error message.

## What Changes

- Fix `parseRequestLine` in `src/core/parser.ts` to correctly parse request lines where the URL contains `{{...}}` expressions with spaces (e.g., `{{$randomInt 1 100}}`)
- The URL regex changes from `(\S+)` to a pattern that allows `{{...}}` expressions with spaces within the URL portion while still delimiting the end of the request line correctly

## Capabilities

### New Capabilities

_(None)_

### Modified Capabilities

- `parser`: The request line parser SHALL accept URLs containing `{{...}}` variable expressions with space-separated arguments

## Impact

- `src/core/parser.ts` — `parseRequestLine` regex updated
- `examples/variables.http` — Second request (`GET {{baseUrl}}/posts/{{$randomInt 1 100}}`) will now parse correctly